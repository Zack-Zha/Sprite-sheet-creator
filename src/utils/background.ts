import type { RGBColor } from '../types';

/**
 * Detect the background color by sampling pixels from the four corners of the image.
 * Samples a 3×3 block from each corner, averages the non-transparent pixels.
 */
export function detectBackgroundColor(imageData: ImageData): RGBColor {
  const { data, width, height } = imageData;
  const corners = [
    { x: 0, y: 0 },
    { x: width - 1, y: 0 },
    { x: 0, y: height - 1 },
    { x: width - 1, y: height - 1 },
  ];

  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let count = 0;

  for (const corner of corners) {
    // Sample a 3×3 block around each corner point
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const sx = Math.min(Math.max(corner.x + dx, 0), width - 1);
        const sy = Math.min(Math.max(corner.y + dy, 0), height - 1);
        const idx = (sy * width + sx) * 4;

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        // Skip fully transparent pixels
        if (a < 128) continue;

        totalR += r;
        totalG += g;
        totalB += b;
        count++;
      }
    }
  }

  if (count === 0) {
    // All corners are transparent, default to white
    return { r: 255, g: 255, b: 255 };
  }

  return {
    r: Math.round(totalR / count),
    g: Math.round(totalG / count),
    b: Math.round(totalB / count),
  };
}

/**
 * Normalized Euclidean distance between two RGB colors.
 * Returns a value in [0, 1], where 0 = identical, 1 = maximum difference.
 * Formula: sqrt((r1-r2)^2 + (g1-g2)^2 + (b1-b2)^2) / sqrt(3 * 255^2)
 */
export function colorDistance(a: RGBColor, b: RGBColor): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  const distance = Math.sqrt(dr * dr + dg * dg + db * db);
  return distance / Math.sqrt(3 * 255 * 255);
}

/**
 * Remove background from a canvas by making pixels near the background color transparent.
 * threshold: 0-100, where 0 = only exact matches removed, 100 = everything removed.
 * Returns a NEW canvas (does not mutate input).
 *
 * Uses feathered alpha: pixels near the threshold get partial transparency
 * for smooth edges (anti-aliased sprite edges).
 */
export function removeBackground(
  source: HTMLCanvasElement,
  backgroundColor: RGBColor,
  threshold: number
): HTMLCanvasElement {
  const result = document.createElement('canvas');
  result.width = source.width;
  result.height = source.height;
  const srcCtx = source.getContext('2d')!;
  const dstCtx = result.getContext('2d')!;

  const imageData = srcCtx.getImageData(0, 0, source.width, source.height);
  const { data } = imageData;

  // Convert threshold to normalized distance (0-100 → 0.0-1.0)
  const normalizedThreshold = threshold / 100;

  // Feather zone: 15% of threshold width for smooth transitions
  const featherWidth = Math.max(0.02, normalizedThreshold * 0.15);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a === 0) continue; // Already transparent

    const dist = colorDistance({ r, g, b }, backgroundColor);

    if (dist <= normalizedThreshold - featherWidth) {
      // Fully transparent
      data[i + 3] = 0;
    } else if (dist < normalizedThreshold + featherWidth) {
      // Feather zone: partial transparency
      const t = (dist - (normalizedThreshold - featherWidth)) / (2 * featherWidth);
      data[i + 3] = Math.round(a * t);
    }
    // else: pixel stays as-is (too far from background color)
  }

  dstCtx.putImageData(imageData, 0, 0);
  return result;
}
