// Shared by the server page and the client app (which can't export helpers to the server).
export type Tab = "live" | "records" | "nights" | "drivers" | "compete";

export const TAB_COOKIE = "racingTab";

export function parseTab(t: string | null | undefined): Tab | null {
  return t === "live" || t === "records" || t === "nights" || t === "drivers" || t === "compete" ? t : null;
}
