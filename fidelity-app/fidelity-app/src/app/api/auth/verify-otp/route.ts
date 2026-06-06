import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyOTP, createSession, setSessionCookie } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "Le code doit contenir 6 chiffres"),
});

function getRedirectForRole(role: string): string {
  switch (role) {
    case "admin":    return "/admin";
    case "staff":    return "/vendor";
    default:         return "/wallet";
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, code } = schema.parse(body);

    // Vérifie le code et retourne la session payload
    const sessionPayload = await verifyOTP(email, code);

    // Crée le JWT de session
    const token = await createSession(sessionPayload);

    // Pose le cookie httpOnly
    setSessionCookie(token);

    return NextResponse.json({
      success: true,
      role: sessionPayload.role,
      redirectTo: getRedirectForRole(sessionPayload.role),
    });
  } catch (err: any) {
    const message =
      err?.errors?.[0]?.message ?? err?.message ?? "Erreur interne";
    const status =
      err?.errors ? 400 :
      message.includes("invalide") || message.includes("expiré") ? 401 :
      500;
    return NextResponse.json({ error: message }, { status });
  }
}
