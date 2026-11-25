// proxy.ts: /racing URL tidying, done before the page renders so they're real redirects.
//   /racing?tab=nights -> /racing/nights   (old links)
//   /racing            -> /racing/<last tab this visitor had open>, if it wasn't Tonight
import { NextResponse, type NextRequest } from "next/server";
import { parseTab, TAB_COOKIE, tabPath } from "./app/racing/lib/tabs";

export function proxy(req: NextRequest) {
  const old = parseTab(req.nextUrl.searchParams.get("tab"));
  if (old) {
    const url = req.nextUrl.clone();
    url.pathname = tabPath(old);
    url.searchParams.delete("tab");
    return NextResponse.redirect(url, 308);
  }
  const last = parseTab(req.cookies.get(TAB_COOKIE)?.value);
  if (last && last !== "live") {
    const url = req.nextUrl.clone();
    url.pathname = tabPath(last);
    return NextResponse.redirect(url, 307);
  }
  return NextResponse.next();
}

export const config = { matcher: "/racing" };
