// app/components/PhotoNav.tsx
"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { sections, type SectionId } from "../sections";

// A section becomes active once its top crosses this fraction of the viewport.
const ACTIVE_LINE = 0.35;

export default function PhotoNav() {
  const [activeSection, setActiveSection] = useState<SectionId>(sections[0].id);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const line = window.innerHeight * ACTIVE_LINE;
      let current: SectionId = sections[0].id;

      for (const { id } of sections) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }

      // Short final sections never reach the line, so treat "scrolled to the
      // bottom" of whichever element is scrolling as reaching the last one.
      const scrollers = [
        document.scrollingElement,
        document.querySelector("[data-scroll-container]"),
      ];
      const atBottom = scrollers.some(
        (s) =>
          s &&
          s.scrollHeight > s.clientHeight &&
          s.scrollTop > 0 &&
          s.scrollTop + s.clientHeight >= s.scrollHeight - 4
      );
      if (atBottom) current = sections[sections.length - 1].id;

      setActiveSection(current);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    // Capture so we hear scrolls from the inner desktop column and the window.
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="relative h-[420px] md:h-full overflow-hidden bg-[#1a1a1a]">
      <Image
        src="/images/PhotoOfAlex.JPG"
        alt="Portrait of Alex Maat sitting on a wooden stool"
        fill
        priority
        sizes="(min-width: 768px) 560px, 100vw"
        className="object-cover object-[50%_30%] md:object-center"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent md:bg-none md:bg-black/15"
      />
      <nav
        aria-label="Sections"
        className="absolute inset-x-0 bottom-0 p-6 md:inset-0 md:flex md:items-center md:justify-center md:p-8 text-center"
      >
        <ul className="flex flex-col items-center">
          {sections.map(({ id, label }) => {
            const isActive = activeSection === id;
            return (
              <li key={id}>
                <a
                  href={`#${id}`}
                  onClick={() => setActiveSection(id)}
                  aria-current={isActive ? "location" : undefined}
                  className={`block font-space-grotesk leading-tight transition-all duration-300 drop-shadow-[0_1px_8px_rgba(0,0,0,0.6)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-red-500 ${
                    isActive
                      ? "text-red-600 text-3xl md:text-4xl py-1"
                      : "text-red-500/80 text-base hover:text-red-500 hover:tracking-wide"
                  }`}
                >
                  {label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
