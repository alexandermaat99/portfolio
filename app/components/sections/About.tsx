// app/components/sections/About.tsx
import SectionLayout from "../layouts/SectionLayout";
import ButtonLink from "../ui/ButtonLink";
import Tags from "../ui/Tags";
import GitHubContributions from "../GitHubContributions";

const EMAIL = "alexander.a.maat@gmail.com";

const socials = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/alexander-maat/",
  },
  { label: "GitHub", href: "https://github.com/alexandermaat99" },
  { label: "Instagram", href: "https://www.instagram.com/alex.maat/" },
];

export default function About() {
  return (
    <SectionLayout id="about" eyebrow="Alex Maat" title="About Me">
      <p>
        Hello! I&apos;m a product manager based in Lehi, UT, with a software
        engineering background and a passion for building engaging, delightful
        user experiences.
      </p>
      <p>
        Today I&apos;m a Product Manager at Brite, where I own{" "}
        <a
          href="#brite"
          className="text-red-600 underline decoration-red-600/40 underline-offset-4 hover:decoration-red-600"
        >
          Benefits Flow and our AI decision support tool
        </a>
        .
      </p>
      <p>
        Before Brite, after earning my Information Systems degree from Brigham
        Young University in December 2024, I was a Core Developer at
        Corelation, Inc., writing C++ for the KeyStone banking platform and
        building reliable, performant core enhancements for credit unions.
      </p>
      <p>
        Outside of work, I recently launched{" "}
        <a
          href="#the-patterns-place"
          className="text-red-600 underline decoration-red-600/40 underline-offset-4 hover:decoration-red-600"
        >
          The Pattern&apos;s Place
        </a>
        , an online marketplace for sewing patterns.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ButtonLink
          href="/alexandermaatresume.pdf"
          download="alexandermaatresume.pdf"
        >
          Download Resume
        </ButtonLink>
        <ButtonLink href={`mailto:${EMAIL}`} variant="secondary">
          Get in touch
        </ButtonLink>
      </div>

      <ul className="flex flex-wrap gap-x-6 gap-y-2 text-base">
        {socials.map(({ label, href }) => (
          <li key={label}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-red-600/40 underline-offset-4 hover:text-red-600 hover:decoration-red-600 transition-colors"
            >
              {label} <span aria-hidden>↗</span>
            </a>
          </li>
        ))}
      </ul>

      <div className="mt-4">
        <h3 className="font-bold text-black dark:text-white mb-2">Currently</h3>
        <ul className="space-y-1 text-base">
          <li className="flex gap-2">
            <span aria-hidden className="text-red-600">
              —
            </span>
            Embracing AI development tools to streamline my workflow
          </li>
          <li className="flex gap-2">
            <span aria-hidden className="text-red-600">
              —
            </span>
            Deepening my TypeScript skills through personal projects
          </li>
        </ul>
      </div>

      <div>
        <h3 className="font-bold text-black dark:text-white mb-3">Toolkit</h3>
        <Tags
          items={["C++", "TypeScript", "Next.js", "SQL", "Python", "Java", "Figma"]}
        />
      </div>

      <div className="mt-4">
        <h3 className="font-bold text-black dark:text-white mb-3">
          GitHub Contributions
        </h3>
        <GitHubContributions />
      </div>
    </SectionLayout>
  );
}
