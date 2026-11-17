// app/api/racing/photo/[id]/route.ts
// A driver's photo. Links include ?v=<hash>, so responses can be cached forever.

import { loadPhoto } from "../../../../racing/lib/store";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response("Not found", { status: 404 });
  const photo = await loadPhoto(id).catch(() => null);
  if (!photo) return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, s-maxage=60" } });
  return new Response(Buffer.from(photo.data, "base64"), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
