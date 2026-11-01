// app/page.tsx
import PhotoNav from "./components/PhotoNav";
import About from "./components/sections/About";
import PatternsPlace from "./components/sections/PatternsPlace";
import WebStream from "./components/sections/WebStream";
import Sandbox from "./components/sections/Sandbox";

export default function Home() {
  return (
    <div className="min-h-dvh md:h-dvh p-4 md:p-8 flex justify-center">
      <main className="w-full max-w-[1200px] border-2 border-red-600 grid grid-cols-1 md:grid-cols-2 md:overflow-hidden">
        <div className="p-4 md:p-8 md:h-full md:min-h-0">
          <PhotoNav />
        </div>
        <div
          data-scroll-container
          className="px-4 md:px-8 md:overflow-y-auto md:min-h-0"
        >
          <About />
          <PatternsPlace />
          <WebStream />
          <Sandbox />
          <footer className="py-10 flex flex-wrap justify-between gap-4 text-sm text-gray-500 dark:text-gray-400 font-space-grotesk">
            <span>© {new Date().getFullYear()} Alex Maat</span>
            <a href="#about" className="hover:text-red-600 transition-colors">
              Back to top ↑
            </a>
          </footer>
        </div>
      </main>
    </div>
  );
}
