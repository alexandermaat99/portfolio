// app/components/sections/Sandbox.tsx
import SectionLayout from "../layouts/SectionLayout";
import Image from "next/image";

export default function Sandbox() {
  return (
    <SectionLayout title="WebStream" id="Rapid Development">
      <div className="flex flex-col gap-4 md:gap-6">
        <p className="text-gray-800 text-base md:text-lg leading-relaxed dark:text-white">
          Fed up with the clunky software on our smart tv, I developed an
          extremely simple web app that allows users to turn their browser into
          a pseudo-smart tv home screen.
        </p>

        <p className="text-gray-800 text-base md:text-lg leading-relaxed dark:text-white">
          I prototyped in Figma, developed in TypeScript and deployed using
          Vercel within an hour.
        </p>
        <div className="mt-4 md:mt-8">
          <Image
            src="/images/WebStreamPrototype.png"
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
        <a
          href="https://webstream-lyart.vercel.app/"
          className="inline-block bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition duration-300 text-center"
          target="_blank"
        >
          Try WebStream live!
        </a>
      </div>
    </SectionLayout>
  );
}
