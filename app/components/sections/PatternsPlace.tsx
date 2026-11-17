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
        src="/images/patterns-place-home.png"
        alt="The Pattern's Place homepage: indie sewing patterns, straight from the designers"
        width={3024}
        height={1964}
        className="mt-2"
      />
      <ProjectImage
        src="/images/patterns-place-product.png"
        alt="A sewing pattern listing on The Pattern's Place, with photos, tags and a download button"
        width={3024}
        height={1964}
      />
    </SectionLayout>
  );
}
