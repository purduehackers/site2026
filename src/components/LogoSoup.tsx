import React from 'react';

interface LogoGridProps {
  logos: string[];
  showGrid?: boolean;
  className?: string;
}

export default function LogoGrid({
  logos,
  showGrid = true,
  className = '',
}: LogoGridProps) {
  const gridLine = showGrid ? 'logo-grid-line' : '';

  return (
    <div className={`flex flex-wrap justify-center ${className}`}>
      {logos.map((src) => (
        <div
          key={src}
          className={`logo-grid-cell flex items-center justify-center w-1/2 sm:w-1/3 md:w-1/4 p-6 md:p-8 ${gridLine}`}
        >
          <img
            src={src}
            alt=""
            className="logo-grid-img h-8 md:h-10 w-auto max-w-full object-contain"
          />
        </div>
      ))}
    </div>
  );
}
