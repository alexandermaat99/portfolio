// app/racing/lib/admin-auth.ts: one admin (the organiser), one password.
// RACING_ADMIN_PASSWORD (Vercel env) is the password; the session cookie is
// "<expiry>.<HMAC(expiry)>" keyed by that password, so changing the password logs everyone out.

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "racing_admin";
const DAYS = 30;

const secret = () => process.env.RACING_ADMIN_PASSWORD || "";
const sign = (exp: string) => createHmac("sha256", secret()).update(`racing-admin:${exp}`).digest("hex");

function same(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const MIN_PASSWORD = 12;

export function adminConfigured(): boolean {
  return secret().length >= MIN_PASSWORD;
}

/** Why admin is off, for the login page (never reveals the password itself). */
export function adminProblem(): string | null {
  if (!secret()) return "Admin isn't set up yet (RACING_ADMIN_PASSWORD isn't set in Vercel).";
  if (secret().length < MIN_PASSWORD)
    return `The admin password in Vercel (RACING_ADMIN_PASSWORD) is too short: use at least ${MIN_PASSWORD} characters, then redeploy.`;
  return null;
}

export function passwordOk(given: unknown): boolean {
  return adminConfigured() && typeof given === "string" && same(given, secret());
}

export function sessionCookie(): { name: string; value: string; options: Record<string, unknown> } {
  const exp = String(Math.floor(Date.now() / 1000) + DAYS * 86400);
  return {
    name: ADMIN_COOKIE,
    value: `${exp}.${sign(exp)}`,
    options: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: DAYS * 86400 },
  };
}

export async function isAdmin(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const v = (await cookies()).get(ADMIN_COOKIE)?.value ?? "";
  const [exp, sig] = v.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return same(sig, sign(exp));
}

/** Changes must come from this site's own pages (the cookie is SameSite=Strict too). */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

/** The sim PC authenticates with the same bearer token it publishes with. */
export function pcAuthorized(req: Request): boolean {
  const expected = process.env.RACING_INGEST_TOKEN;
  if (!expected) return false;
  return same((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, ""), expected);
}
