// Shared by the server page and the client app (which can't export helpers to the server).
export type Tab = "live" | "records" | "stats" | "drivers" | "cars" | "compete";

export const TAB_COOKIE = "racingTab";

export function parseTab(t: string | null | undefined): Tab | null {
  if (t === "nights") return "stats"; // the Nights tab became Stats (old links and cookies)
  return t === "live" || t === "records" || t === "stats" || t === "drivers" || t === "cars" || t === "compete" ? t : null;
}

/** URL for a tab: /racing for Tonight, /racing/<tab> for the rest. */
export function tabPath(t: Tab): string {
  return t === "live" ? "/racing" : `/racing/${t}`;
}
