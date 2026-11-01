// app/components/sections/Brite.tsx
import SectionLayout from "../layouts/SectionLayout";
import ButtonLink from "../ui/ButtonLink";
import Tags from "../ui/Tags";

const products = [
  {
    name: "Benefits Flow",
    description:
      "Manages the import of benefits data. Benefits Flow uses AI and integrations with third parties to automate the inflow of plan information into Brite.",
    tags: ["AI", "Integrations", "Data import"],
  },
  {
    name: "AI Decision Support",
    description:
      "An AI-powered decision support tool that makes it easier for employees to understand their options and make better benefits decisions.",
    tags: ["AI", "Decision support", "Employee experience"],
  },
];

export default function Brite() {
  return (
    <SectionLayout id="brite" eyebrow="Product Manager · Current" title="Brite">
      <p>
        Brite is a benefits communication platform that guides employees to
        better benefits decisions. As a Product Manager, I own two products
        that sit on either side of that experience: getting benefits data in,
        and helping employees act on it.
      </p>

      <ul className="grid gap-4">
        {products.map(({ name, description, tags }) => (
          <li
            key={name}
            className="rounded-lg border border-red-600/30 p-5 md:p-6 flex flex-col gap-3"
          >
            <h3 className="text-xl md:text-2xl font-bold text-black dark:text-white">
              {name}
            </h3>
            <p>{description}</p>
            <Tags items={tags} />
          </li>
        ))}
      </ul>

      <p>
        Coming from C++ engineering, I work closely with our developers to turn
        customer problems into shipped features.
      </p>
      <ButtonLink href="https://www.britebenefits.com/" external>
        Visit britebenefits.com
      </ButtonLink>
    </SectionLayout>
  );
}
