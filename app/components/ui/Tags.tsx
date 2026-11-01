// app/components/ui/Tags.tsx
export default function Tags({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Tools used">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-full border border-red-600/40 px-3 py-0.5 text-sm text-red-600"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
