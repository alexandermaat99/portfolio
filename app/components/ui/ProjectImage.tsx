// app/components/ui/ProjectImage.tsx
import Image from "next/image";

interface ProjectImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
  className?: string;
}

export default function ProjectImage({
  src,
  alt,
  width,
  height,
  caption,
  className = "",
}: ProjectImageProps) {
  return (
    <figure className={className}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        sizes="(min-width: 1200px) 540px, (min-width: 768px) 45vw, 100vw"
        className="w-full h-auto rounded-lg border border-black/10 dark:border-white/10 shadow-sm"
      />
      {caption && (
        <figcaption className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
