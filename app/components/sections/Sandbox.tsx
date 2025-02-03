// app/components/sections/Sandbox.tsx
import SectionLayout from "../layouts/SectionLayout";
import Image from "next/image";

export default function Sandbox() {
  return (
    <SectionLayout title="Sandbox 02" id="sandbox">
      <div className="flex flex-col gap-4 md:gap-6">
        <p className="text-red-600 text-base md:text-base leading-relaxed dark:text-red-600">
          TLDR: Took part in BYU startup incubator as a designer to develop SaaS
          apps.
        </p>
        <p className="text-gray-800 text-base md:text-lg leading-relaxed dark:text-white">
          Sandbox is Brigham Young University&apos;s startup incubator. Over the
          course of 2 semesters, I worked with a team to create a SaaS startup
          that would eventually gain investor funding.
        </p>

        <p className="text-gray-800 text-base md:text-lg leading-relaxed dark:text-white">
          Within a team of 3, I worked as the sole designer to create the UX/UI
          for multiple SaaS platforms.
        </p>
        <div className="mt-4 md:mt-8">
          <Image
            src="/images/proxxy draft.png"
            alt="Sandbox Project Preview"
            width={1200}
            height={675}
            className="rounded-lg w-full"
            priority
          />
        </div>
        <p className="text-gray-800 text-base md:text-lg leading-relaxed dark:text-white">
          My understanding of software development gave me an advantage in
          making powerful prototypes; engaging for users and efficient for
          developers.
        </p>

        <p className="text-gray-800 text-base md:text-lg leading-relaxed dark:text-white">
          This experience deepened my appreciation for software development and
          encouraged me to switch my major to Information Systems as I saw the
          importance in technical positions.
        </p>
        <div className="mt-4 md:mt-8">
          <Image
            src="/images/proxxyLogo.png"
            alt="Sandbox Logo"
            width={1200}
            height={675}
            className="rounded-lg w-full"
            priority
          />
        </div>
        <div className="mt-4 md:mt-8">
          <Image
            src="/images/prototype.png"
            alt="Sandbox Prototype"
            width={1200}
            height={675}
            className="rounded-lg w-full"
            priority
          />
        </div>
      </div>
    </SectionLayout>
  );
}
