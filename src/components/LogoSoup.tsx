interface LogoSoupProps {
  logos: string[];
  baseSize?: number;
  scaleFactor?: number;
  className?: string;
}

export default function LogoSoup({
  logos,
  baseSize = 32,
  className,
}: LogoSoupProps) {
  return (
    <div className={className}>
      {logos.map((src) => (
        <img
          key={src}
          src={src}
          alt=""
          height={baseSize}
          style={{ height: baseSize, width: "auto" }}
          className="inline-block p-2 align-middle"
        />
      ))}
    </div>
  );
}
