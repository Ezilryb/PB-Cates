import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import type { SessionPayload } from "@/types";

const SESSION_COOKIE = "fidelity_session";

function getSessionSecret() {
  return new TextEncoder().encode(process.env.SESSION_SECRET!);
}

async function getSessionFromRequest(
  req: NextRequest
): Promise<SessionPayload | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSessionSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// Routes protégées et leurs rôles requis
const PROTECTED_ROUTES: Array<{ pattern: RegExp; roles: string[] }> = [
  { pattern: /^\/wallet/, roles: ["customer"] },
  { pattern: /^\/vendor/, roles: ["staff", "admin"] },
  { pattern: /^\/admin/, roles: ["admin"] },
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Ignore les routes API et les assets statiques
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  // Redirige la racine vers le login
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const session = await getSessionFromRequest(req);

  // Vérifie les routes protégées
  for (const route of PROTECTED_ROUTES) {
    if (route.pattern.test(pathname)) {
      if (!session) {
        const loginUrl = new URL("/login", req.url);
        loginUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(loginUrl);
      }
      if (!route.roles.includes(session.role)) {
        // Redirige vers la bonne page selon le rôle réel
        return NextResponse.redirect(
          new URL(getHomeForRole(session.role), req.url)
        );
      }
      return NextResponse.next();
    }
  }

  // Page de login : redirige si déjà connecté
  if (pathname === "/login" && session) {
    return NextResponse.redirect(
      new URL(getHomeForRole(session.role), req.url)
    );
  }

  return NextResponse.next();
}

function getHomeForRole(role: string): string {
  switch (role) {
    case "admin":    return "/admin";
    case "staff":    return "/vendor";
    case "customer": return "/wallet";
    default:         return "/login";
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
