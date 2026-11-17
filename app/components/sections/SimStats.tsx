// app/components/sections/SimStats.tsx
import SectionLayout from "../layouts/SectionLayout";
import ButtonLink from "../ui/ButtonLink";
import ProjectImage from "../ui/ProjectImage";
import Tags from "../ui/Tags";

export default function SimStats() {
  return (
    <SectionLayout id="simstats" eyebrow="Side Project" title="SimStats">
      <Tags items={["Python", "iRacing SDK", "SQLite", "Next.js"]} />
      <p className="text-red-600">
        TL;DR: An app that reads iRacing telemetry to automatically record lap
        times and leaderboards when friends take turns on my sim rig.
      </p>
      <p>
        When friends come over to race, we take turns in iRacing&apos;s test
        mode, and nobody was keeping track of times. SimStats runs in the
        background on the sim PC, reads the car&apos;s telemetry, and records
        every lap, who drove it, and whether it was clean.
      </p>
      <p>
        Everyone follows along on their phones or the TV: a live lap timer, a
        live delta to the fastest lap of the night, and leaderboards for every
        track and car we drive. It also publishes here, so you can watch along
        when you&apos;re not in the room.
      </p>
      <ProjectImage
        src="/images/simstats-tv.png"
        alt="SimStats TV view showing the current driver, lap timer, live delta and leaderboards"
        width={1920}
        height={1080}
        caption="The big-screen view we put on the TV during race nights."
      />
      <ButtonLink href="/racing">See the live leaderboard</ButtonLink>
    </SectionLayout>
  );
}
