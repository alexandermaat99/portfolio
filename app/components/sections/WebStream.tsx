// app/components/sections/WebStream.tsx
import SectionLayout from "../layouts/SectionLayout";
import ButtonLink from "../ui/ButtonLink";
import ProjectImage from "../ui/ProjectImage";
import Tags from "../ui/Tags";

export default function WebStream() {
  return (
    <SectionLayout id="webstream" eyebrow="Rapid Development" title="WebStream">
      <Tags items={["Figma", "TypeScript", "Vercel"]} />
      <p>
        Fed up with the clunky software on our smart TV, I developed an
        extremely simple web app that turns any browser into a pseudo-smart TV
        home screen.
      </p>
      <p>
        I prototyped in Figma, developed in TypeScript, and deployed on Vercel,
        all within an hour.
      </p>
      <ProjectImage
        src="/images/WebStreamPrototype.png"
        alt="WebStream home screen prototype showing a grid of streaming services"
        width={3982}
        height={2468}
      />
      <ButtonLink href="https://webstream-lyart.vercel.app/" external>
        Try WebStream live
      </ButtonLink>
    </SectionLayout>
  );
}
