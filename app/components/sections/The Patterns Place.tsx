// app/components/sections/Sandbox.tsx
import SectionLayout from "../layouts/SectionLayout";
import Image from "next/image";

export default function thepatternsplace() {
  return (
    <SectionLayout title="The Pattern's Place" id="Developing a Marketplace">
      <div className="flex flex-col gap-4 md:gap-6">
        <p className="text-gray-800 text-base md:text-lg leading-relaxed dark:text-white">
          My wife, an avid sewist, struggled to find a modern marketplace sewing
          patterns.
        </p>
        <p className="text-gray-800 text-base md:text-lg leading-relaxed dark:text-white">
          As the sewing community grows larger and younger every year, existing
          marketplaces are outdated and difficult to navigate.
        </p>

        <p className="text-gray-800 text-base md:text-lg leading-relaxed dark:text-white">
          I&apos;m currently developing a online marketplace for sewing patterns
          called The Pattern&apos;s Place.
        </p>
        <p className="text-gray-800 font-semibold text-base md:text-sm leading-relaxed dark:text-white">
          Stack: Next.js, TypeScript, Supabase
        </p>
        <a
          href="https://thepatternsplace.com/"
          className="inline-block bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition duration-300 text-center"
          target="_blank"
        >
          Visit Our Landing Page
        </a>

        <div className="mt-4 md:mt-8">
          <Image
            src="/images/Pattern's Place Login.png"
            alt="Sandbox Project Preview"
            width={1200}
            height={675}
            className="rounded-lg w-full"
            priority
          />
        </div>
        <div className="mt-4 md:mt-8">
          <Image
            src="/images/Pattern's Place Proto.png"
            alt="Sandbox Project Preview"
            width={1200}
            height={675}
            className="rounded-lg w-full"
            priority
          />
        </div>
        {/* <p className="text-gray-800 text-base md:text-lg leading-relaxed">
          My understanding of software development gave me an advantage in
          making powerful prototypes; engaging for users and efficient for
          developers.
        </p> */}
      </div>
    </SectionLayout>
  );
}
