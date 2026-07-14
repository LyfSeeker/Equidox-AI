type BrandIconName = "passport" | "escrow" | "milestone" | "builder";

type BrandIconProps = {
  name: BrandIconName;
  className?: string;
  title?: string;
};

/** Silhouette icons tinted via `currentColor` (gold / cyan / zinc). */
export default function BrandIcon({ name, className = "", title }: BrandIconProps) {
  return (
    <span
      role="img"
      aria-label={title || name}
      title={title}
      className={`inline-block shrink-0 bg-current ${className}`}
      style={{
        WebkitMaskImage: `url(/icons/${name}.png)`,
        maskImage: `url(/icons/${name}.png)`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}
