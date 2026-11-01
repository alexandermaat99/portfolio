// app/components/sections/Sandbox.tsx
import Image from "next/image";
import SectionLayout from "../layouts/SectionLayout";
import ProjectImage from "../ui/ProjectImage";
import Tags from "../ui/Tags";

export default function Sandbox() {
  return (
    <SectionLayout id="sandbox" eyebrow="Startup Incubator" title="Sandbox 02">
      <Tags items={["Figma", "UX/UI", "Product Design"]} />
      <p className="text-red-600">
        TL;DR: Co-founded Proxxy.ai in BYU&apos;s startup incubator as the
        founding designer for our SaaS apps.
      </p>
      <p>
        Sandbox is Brigham Young University&apos;s startup incubator. Over the
        course of 2 semesters, I worked with a team to create a SaaS startup
        that would eventually gain investor funding.
      </p>
      <p>
        Within a team of 3, I worked as the sole designer, creating the UX/UI
        for multiple SaaS platforms across web and mobile.
      </p>

      <div className="py-4">
        <Image
          src="/images/proxxyLogo.png"
          alt="Proxxy logo"
          width={2602}
          height={878}
          sizes="(min-width: 768px) 320px, 60vw"
          className="w-2/3 max-w-xs h-auto dark:hidden"
        />
        <Image
          src="/images/proxxyLogoLight.png"
          alt="Proxxy logo"
          width={1337}
          height={477}
          sizes="(min-width: 768px) 320px, 60vw"
          className="w-2/3 max-w-xs h-auto hidden dark:block"
        />
      </div>

      <ProjectImage
        src="/images/proxxy draft.png"
        alt="Proxxy product design draft"
        width={3830}
        height={2356}
      />
      <p>
        My understanding of software development gave me an advantage in
        making powerful prototypes: engaging for users and efficient for
        developers.
      </p>
      <p>
        This experience deepened my appreciation for software development and
        encouraged me to switch my major to Information Systems, as I saw the
        importance of technical roles.
      </p>
      <ProjectImage
        src="/images/prototype.png"
        alt="Proxxy interactive prototype screens"
        width={3368}
        height={1270}
      />
    </SectionLayout>
  );
}
