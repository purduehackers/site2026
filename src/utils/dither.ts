const BAYER_4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** white -> black dithered gradient (data URL) for hero -> black section */
export function getHeroDitherSvg(width = 4, height = 128): string {
  const rects: string[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const level = Math.floor(y / 4) / 32;
      const threshold = BAYER_4[y % 4][x] / 16;
      if (level > threshold) {
        rects.push(
          `<rect x="${x}" y="${y}" width="1" height="1" fill="#000"/>`
        );
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#fffbf1"/>${rects.join('')}</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

/** black -> transparent dithered gradient (data URL) for black section -> pic */
export function getFooterDitherSvg(width = 4, height = 128): string {
  const rects: string[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const level = 1 - y / height;
      const threshold = BAYER_4[y % 4][x % 4] / 16;
      if (level > threshold) {
        rects.push(
          `<rect x="${x}" y="${y}" width="1" height="1" fill="#000"/>`
        );
      }
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${rects.join('')}</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

export function getPixelIndices(): number[] {
  const pixelIndices = Array.from({ length: 120 }, (_, i) => i);
  for (let i = pixelIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pixelIndices[i], pixelIndices[j]] = [pixelIndices[j], pixelIndices[i]];
  }
  return pixelIndices;
}
