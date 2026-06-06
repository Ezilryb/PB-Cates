import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getSupabaseServerClient } from "./supabase-server";
import type { SessionPayload } from "@/types";

const SESSION_COOKIE = "fidelity_session";
const SESSION_DURATION = "7d";

function getSessionSecret() {
  return new TextEncoder().encode(process.env.SESSION_SECRET!);
}

// ----------------------------------------------------------------
// JWT Session
// ----------------------------------------------------------------

export async function createSession(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(getSessionSecret());
}

export async function verifySession(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

export function setSessionCookie(token: string): void {
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 jours
    path: "/",
  });
}

export function clearSessionCookie(): void {
  cookies().set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

// ----------------------------------------------------------------
// OTP Generation & Verification
// ----------------------------------------------------------------

/** Génère et stocke un code OTP à 6 chiffres valable 10 minutes */
export async function generateAndStoreOTP(email: string): Promise<string> {
  const db = getSupabaseServerClient();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // Invalide les anciens codes non utilisés pour cet email
  await db
    .from("otp_codes")
    .update({ used: true })
    .eq("email", email.toLowerCase())
    .eq("used", false);

  const { error } = await db.from("otp_codes").insert({
    email: email.toLowerCase(),
    code,
    expires_at: expiresAt,
  });

  if (error) throw new Error(`OTP creation failed: ${error.message}`);
  return code;
}

/** Vérifie un OTP et retourne la session payload si valide */
export async function verifyOTP(
  email: string,
  code: string
): Promise<SessionPayload> {
  const db = getSupabaseServerClient();
  const normalEmail = email.toLowerCase().trim();

  // 1. Vérification du code
  const { data: otp, error } = await db
    .from("otp_codes")
    .select("*")
    .eq("email", normalEmail)
    .eq("code", code)
    .eq("used", false)
    .gte("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !otp) {
    throw new Error("Code invalide ou expiré. Vérifiez et réessayez.");
  }

  // 2. Marquer comme utilisé
  await db.from("otp_codes").update({ used: true }).eq("id", otp.id);

  // 3. Vérifie si c'est un compte staff/admin
  const { data: staff } = await db
    .from("staff_accounts")
    .select("id, role, restaurant_id")
    .eq("email", normalEmail)
    .single();

  if (staff) {
    return {
      userId: staff.id,
      email: normalEmail,
      role: staff.role as "staff" | "admin",
      restaurantId: staff.restaurant_id,
    };
  }

  // 4. Sinon c'est un client — crée le compte si besoin
  let { data: customer } = await db
    .from("customers")
    .select("id")
    .eq("email", normalEmail)
    .single();

  if (!customer) {
    const { data: newCustomer, error: createError } = await db
      .from("customers")
      .insert({ email: normalEmail })
      .select("id")
      .single();

    if (createError || !newCustomer) {
      throw new Error(`Erreur création compte: ${createError?.message}`);
    }
    customer = newCustomer;
  }

  return {
    userId: customer.id,
    email: normalEmail,
    role: "customer",
  };
}
