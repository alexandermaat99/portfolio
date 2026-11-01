// app/components/GitHubContributions.tsx
"use client";
import dynamic from "next/dynamic";

const GitHubCalendar = dynamic(() => import("react-github-calendar"), {
  ssr: false,
  loading: () => <div className="h-[150px]" />,
});

// Five-step scales in the site's red, for light and dark mode.
const theme = {
  light: ["#f3e9dc", "#fca5a5", "#f87171", "#dc2626", "#991b1b"],
  dark: ["#1f1f1f", "#7f1d1d", "#b91c1c", "#dc2626", "#f87171"],
};

export default function GitHubContributions() {
  return (
    <GitHubCalendar
      username="alexandermaat99"
      theme={theme}
      fontSize={14}
      errorMessage="Couldn't load GitHub activity right now."
    />
  );
}
