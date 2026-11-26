// POST {password} -> admin session cookie.
import { cookies } from "next/headers";
import { adminConfigured, passwordOk, sameOrigin, sessionCookie } from "../../../../racing/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return Response.json({ error: "Bad origin" }, { status: 403 });
  if (!adminConfigured()) return Response.json({ error: "Admin isn't set up (RACING_ADMIN_PASSWORD)" }, { status: 503 });
  const body = (await req.json().catch(() => ({}))) as { password?: unknown };
  if (!passwordOk(body.password)) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return Response.json({ error: "Wrong password" }, { status: 401 });
  }
  const c = sessionCookie();
  (await cookies()).set(c.name, c.value, c.options);
  return Response.json({ ok: true });
}
