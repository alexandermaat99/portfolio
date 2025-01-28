// app/components/layouts/SectionLayout.tsx
interface SectionLayoutProps {
  title: string;
  id: string;
  children: React.ReactNode;
}

export default function SectionLayout({
  title,
  id,
  children,
}: SectionLayoutProps) {
  return (
    <section className=" py-4 min-h-screen md:py-8 font-space-grotesk">
      <div className="mb-4 md:mb-8 w-full font-space-grotesk pb-11">
        <h3 className="text-red-600 text-lg md:text-xl mb-2 font-space-grotesk">
          {title}
        </h3>
        <div className="flex justify-center mb-4 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold">
            {id === "sandbox" ? "_" : ""}
            {id}
          </h1>
        </div>
        {children}
      </div>
    </section>
  );
}
