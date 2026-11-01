// app/components/sections/PatternsPlace.tsx
import SectionLayout from "../layouts/SectionLayout";
import ButtonLink from "../ui/ButtonLink";
import ProjectImage from "../ui/ProjectImage";
import Tags from "../ui/Tags";

export default function PatternsPlace() {
  return (
    <SectionLayout
      id="the-patterns-place"
      eyebrow="Side Project"
      title="The Pattern's Place"
    >
      <Tags items={["TypeScript", "Next.js", "Supabase"]} />
      <p>
        My wife, an avid sewist, struggled to find a modern marketplace for
        sewing patterns.
      </p>
      <p>
        As the sewing community grows larger and younger every year, existing
        marketplaces feel outdated and difficult to navigate.
      </p>
      <p>
        So we built and launched The Pattern&apos;s Place, an online
        marketplace for sewing patterns.
      </p>
      <ButtonLink href="https://thepatternsplace.com/" external>
        Visit thepatternsplace.com
      </ButtonLink>

      <ProjectImage
        src="/images/Pattern's Place Login.png"
        alt="The Pattern's Place sign-in screen"
        width={3024}
        height={1964}
        className="mt-2"
      />
      <ProjectImage
        src="/images/Pattern's Place Proto.png"
        alt="The Pattern's Place marketplace prototype"
        width={3024}
        height={1964}
      />
    </SectionLayout>
  );
}
