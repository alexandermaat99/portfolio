"use client";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

interface Section {
  id: string;
  title: string;
  component: React.ComponentType<object>;
}

const sections: Section[] = [
  {
    id: "About Me",
    title: "Alex Maat",
    component: dynamic(() => import("./components/sections/Alex Maat"), {
      ssr: true,
    }),
  },
  {
    id: "sandbox",
    title: "Sandbox 02",
    component: dynamic(() => import("./components/sections/Sandbox"), {
      ssr: false,
    }),
  },
  {
    id: "Rapid Development",
    title: "WebStream",
    component: dynamic(() => import("./components/sections/WebStream"), {
      ssr: false,
    }),
  },
  {
    id: "The Pattern's Place",
    title: "The Pattern's Place",
    component: dynamic(
      () => import("./components/sections/The Patterns Place"),
      {
        ssr: false,
      }
    ),
  },
];

export default function Home() {
  const [activeSection, setActiveSection] = useState<string>(sections[0].id);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768;
      setIsMobile(isMobileDevice);
      if (!isMobileDevice) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "auto";
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
      document.body.style.overflow = "auto";
    };
  }, []);

  useEffect(() => {
    if (isMobile === false) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveSection(entry.target.id);
            }
          });
        },
        { threshold: 0.5 }
      );

      sections.forEach((section) => {
        const element = document.getElementById(section.id);
        if (element) observer.observe(element);
      });

      return () => observer.disconnect();
    }
  }, [isMobile]);

  const scrollToSection = useCallback(
    (id: string) => {
      const element = document.getElementById(id);
      if (isMobile) {
        setActiveSection(id);
      } else {
        element?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [isMobile]
  );

  if (isMobile === null) {
    return null; // or a loading spinner
  }

  return (
    <div className="w-screen h-screen p-4 md:p-8 dark:bg-black bg-[#fff8ed] flex justify-center items-center">
      <div className="w-full md:w-[1200px] h-[100%] border-2 border-red-600 grid grid-cols-1 md:grid-cols-2">
        <div className="relative h-[200px] md:h-full p-4 md:p-8">
          <div className="relative w-full h-full bg-[#1a1a1a]">
            <Image
              src="/images/PhotoOfAlex.JPG"
              alt="Profile Photo"
              fill
              style={{ objectFit: "cover" }}
              priority
            />
            <div className="absolute inset-0 flex flex-col justify-center items-center p-4 md:p-8 text-center">
              <div className="space-y-0">
                {sections.map((section) => (
                  <div
                    key={section.id}
                    onClick={() => scrollToSection(section.id)}
                    className={`cursor-pointer transition-all duration-30 
                      ${
                        activeSection === section.id
                          ? "text-red-600"
                          : "text-red-600/80"
                      }`}
                  >
                    <h2
                      className={`font-normal transition-all duration-300 font-space-grotesk
                      ${
                        activeSection === section.id ? "text-4xl" : "text-1xl"
                      }`}
                    >
                      {section.title}
                    </h2>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 md:p-8 overflow-y-auto no-scrollbar">
          {isMobile ? (
            <div id={activeSection}>
              {(() => {
                const Component = sections.find(
                  (s) => s.id === activeSection
                )?.component;
                return Component ? <Component /> : null;
              })()}
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.id} id={section.id}>
                <section.component />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
