// app/components/sections/Present.tsx
import SectionLayout from "../layouts/SectionLayout";
import Image from "next/image";

// import Image from "next/image";

export default function Me() {
  return (
    <SectionLayout title="Alex Maat" id="About Me">
      <div className="flex flex-col gap-4 md:gap-6">
        <p className="text-gray-800 text-base md:text-lg leading-relaxed">
          Hello! I&apos;m a software developer based in Lehi, UT passionate
          about developing engaging and pleasing user experiences. <br></br>{" "}
          <br></br> With a fresh Information Systems degree from Brigham Young
          University (December 2024) I&apos;m excited to apply my fresh
          perspective and growing skills to real-world projects. <br></br>{" "}
          <br></br>Curious about the projects that showcase my potential?
          Explore further to see how I can bring value to your team.
        </p>

        <a
          href="/alexandermaatresume.pdf"
          download="alexandermaatresume.pdf"
          className="inline-block bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 transition duration-300 text-center"
        >
          Download Resume
        </a>
        <div className="flex gap-4 justify-end">
          <a
            href="https://www.linkedin.com/in/alexander-m-b88328111/"
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
            <Image
              src="/images/linkedin.png"
              alt="LinkedIn"
              width={40}
              height={40}
            />
          </a>
          <a
            href="https://github.com/alexandermaat99"
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
            <Image
              src="/images/gitHub.png"
              alt="GitHub"
              width={40}
              height={40}
            />
          </a>
          <a
            href="https://www.instagram.com/alex.maat/"
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
            <Image
              src="/images/instagram.png"
              alt="Instagram"
              width={40}
              height={40}
            />
          </a>
        </div>
      </div>
    </SectionLayout>
  );
}
