// app/sections.ts
// Order here drives both the photo nav and the order sections render in.
export const sections = [
  { id: "about", label: "Alex Maat" },
  { id: "brite", label: "Brite" },
  { id: "the-patterns-place", label: "The Pattern's Place" },
  { id: "webstream", label: "WebStream" },
  { id: "sandbox", label: "Sandbox 02" },
] as const;

export type SectionId = (typeof sections)[number]["id"];
