export const categoryColors: Record<string, string> = {
  "hack-night": "bg-ph-yellow text-ph-black",
  workshop: "bg-ph-pink text-ph-black",
  show: "bg-ph-orange text-ph-black",
  other: "bg-ph-purple text-ph-cream",
};

export const categorySlug = (category: string) => category.trim().toLowerCase().replace(/\s+/g, "-");

export const categoryClasses = (category: string) => categoryColors[categorySlug(category)] ?? categoryColors.other;
