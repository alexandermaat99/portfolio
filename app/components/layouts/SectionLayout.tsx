// app/components/layouts/SectionLayout.tsx
interface SectionLayoutProps {
  id: string;
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}

export default function SectionLayout({
  id,
  eyebrow,
  title,
  children,
}: SectionLayoutProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-4 py-10 md:py-16 border-b border-red-600/20 last:border-b-0 font-space-grotesk text-gray-800 dark:text-gray-100"
    >
      <p className="text-red-600 text-base md:text-lg mb-1">{eyebrow}</p>
      <h2
        id={`${id}-heading`}
        className="text-3xl md:text-4xl font-bold text-black dark:text-white mb-6"
      >
        {title}
      </h2>
      <div className="flex flex-col gap-5 text-base md:text-lg leading-relaxed">
        {children}
      </div>
    </section>
  );
}
