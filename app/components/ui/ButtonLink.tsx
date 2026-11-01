// app/components/ui/ButtonLink.tsx
import type { AnchorHTMLAttributes } from "react";

interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: "primary" | "secondary";
  external?: boolean;
}

const variants = {
  primary: "bg-red-600 text-white hover:bg-red-700",
  secondary:
    "border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white",
};

export default function ButtonLink({
  variant = "primary",
  external = false,
  className = "",
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <a
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded py-2 px-4 text-center text-base transition duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 ${variants[variant]} ${className}`}
    >
      {children}
      {external && <span aria-hidden>↗</span>}
    </a>
  );
}
