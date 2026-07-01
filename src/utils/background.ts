import type { RGBColor, BackgroundRemovalOptions } from '../types';

// ─── Color utilities ──────────────────────────────────────────────

/** Normalized Euclidean distance [0,1] */
export function colorDistance(a: RGBColor, b: RGBColor): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return Math.sqrt(dr * dr + dg * dg + db * db) / Math.sqrt(3 * 255 * 255);
}

/** Read a pixel color from ImageData. Returns null if coords out of bounds or alpha below threshold. */
export function getPixelColor(
  imageData: ImageData,
  x: number,
  y: number,
  alphaThreshold = 16
): RGBColor | null {
  if (x < 0 || y < 0 || x >= imageData.width || y >= imageData.height) return null;
  const idx = (y * imageData.width + x) * 4;
  if (imageData.data[idx + 3] < alphaThreshold) return null;
  return {
    r: imageData.data[idx],
    g: imageData.data[idx + 1],
    b: imageData.data[idx + 2],
  };
}

// ─── Robust background detection ──────────────────────────────────

/**
 * Sample all 4 border edges. Quantize colors into 16-unit buckets,
 * pick the dominant bucket, average its RGB. Much more robust than
 * corner-only sampling — won't get thrown off by a sprite touching one corner.
 */
export function robustDetectBorderBackgroundColor(
  imageData: ImageData,
  alphaThreshold = 16
): RGBColor {
  const { data, width, height } = imageData;
  const bucketSize = 16;
  const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();

  function sample(x: number, y: number) {
    const idx = (y * width + x) * 4;
    if (data[idx + 3] < alphaThreshold) return;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const key = `${Math.floor(r / bucketSize)}_${Math.floor(g / bucketSize)}_${Math.floor(b / bucketSize)}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.r += r; existing.g += g; existing.b += b; existing.count++;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  // Top & bottom rows
  for (let x = 0; x < width; x++) {
    sample(x, 0);
    sample(x, height - 1);
  }
  // Left & right columns (skip corners, already sampled)
  for (let y = 1; y < height - 1; y++) {
    sample(0, y);
    sample(width - 1, y);
  }

  if (buckets.size === 0) return { r: 255, g: 255, b: 255 };

  // Find dominant bucket
  let best: { r: number; g: number; b: number; count: number } | null = null;
  for (const b of buckets.values()) {
    if (!best || b.count > best.count) best = b;
  }
  const bg = best!;
  return {
    r: Math.round(bg.r / bg.count),
    g: Math.round(bg.g / bg.count),
    b: Math.round(bg.b / bg.count),
  };
}

// ─── Legacy 4-corner detection (kept for compatibility) ───────────

export function detectBackgroundColor(imageData: ImageData): RGBColor {
  return robustDetectBorderBackgroundColor(imageData);
}

// ─── Edge-connected flood fill (shared engine) ────────────────────

function isBackgroundLike(
  data: Uint8ClampedArray,
  idx: number,
  bgColor: RGBColor,
  normalizedThreshold: number
): boolean {
  const r = data[idx];
  const g = data[idx + 1];
  const b = data[idx + 2];
  return colorDistance({ r, g, b }, bgColor) <= normalizedThreshold;
}

function hasTransparentNeighbor(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number
): boolean {
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]];
  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
    if (data[(ny * width + nx) * 4 + 3] === 0) return true;
  }
  return false;
}

/**
 * Edge-connected flood fill removal.
 * Only removes pixels reachable from image edges through background-like colors.
 * Interior white pixels (eyes, highlights, clothes) are preserved.
 */
export function removeBackgroundEdgeConnected(
  source: HTMLCanvasElement,
  options: BackgroundRemovalOptions
): HTMLCanvasElement {
  const result = document.createElement('canvas');
  result.width = source.width;
  result.height = source.height;
  const srcCtx = source.getContext('2d')!;
  const imageData = srcCtx.getImageData(0, 0, source.width, source.height);
  const { data, width, height } = imageData;

  const normalizedThreshold = options.threshold / 100;
  const alphaThresh = options.alphaThreshold ?? 16;

  const bgColor = options.seedColor ?? robustDetectBorderBackgroundColor(imageData, alphaThresh);

  // BFS from border pixels that are background-like
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height * 2); // [x, y] pairs
  let head = 0;
  let tail = 0;

  function enqueue(x: number, y: number) {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = y * width + x;
    if (visited[i]) return;
    if (data[i * 4 + 3] < alphaThresh) return; // already transparent
    if (!isBackgroundLike(data, i * 4, bgColor, normalizedThreshold)) return;
    visited[i] = 1;
    queue[tail++] = x;
    queue[tail++] = y;
  }

  // Seed from all 4 borders
  for (let x = 0; x < width; x++) { enqueue(x, 0); enqueue(x, height - 1); }
  for (let y = 1; y < height - 1; y++) { enqueue(0, y); enqueue(width - 1, y); }

  // BFS (4-neighbor)
  while (head < tail) {
    const x = queue[head++];
    const y = queue[head++];
    enqueue(x - 1, y);
    enqueue(x + 1, y);
    enqueue(x, y - 1);
    enqueue(x, y + 1);
  }

  // Apply alpha
  for (let i = 0; i < width * height; i++) {
    if (visited[i]) {
      if (options.hardAlpha) {
        data[i * 4 + 3] = 0;
      } else if (options.feather) {
        // Feather: partial transparency near threshold boundary
        const r = data[i * 4];
        const g = data[i * 4 + 1];
        const b = data[i * 4 + 2];
        const dist = colorDistance({ r, g, b }, bgColor);
        const featherW = Math.max(0.02, normalizedThreshold * 0.15);
        if (dist <= normalizedThreshold - featherW) {
          data[i * 4 + 3] = 0;
        } else if (dist < normalizedThreshold + featherW) {
          const t = (dist - (normalizedThreshold - featherW)) / (2 * featherW);
          data[i * 4 + 3] = Math.round(data[i * 4 + 3] * t);
        }
      } else {
        data[i * 4 + 3] = 0;
      }
    }
  }

  // Edge cleanup: remove background-colored pixels touching transparent areas
  if (options.edgeCleanup) {
    const cleanupThreshold = normalizedThreshold * 0.75;
    // One pass only
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (data[idx + 3] === 0) continue;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        if (colorDistance({ r, g, b }, bgColor) < cleanupThreshold) {
          if (hasTransparentNeighbor(data, width, height, x, y)) {
            data[idx + 3] = 0;
          }
        }
      }
    }
  }

  const dstCtx = result.getContext('2d')!;
  dstCtx.putImageData(imageData, 0, 0);
  return result;
}

// ─── Magic wand mode ──────────────────────────────────────────────

/**
 * Magic wand: user clicks a background pixel, we use that color
 * and run edge-connected flood fill.
 */
export function removeBackgroundMagicWand(
  source: HTMLCanvasElement,
  options: BackgroundRemovalOptions
): HTMLCanvasElement {
  const opts = { ...options };
  if (!opts.seedColor && opts.seedPoint) {
    const srcCtx = source.getContext('2d')!;
    const imageData = srcCtx.getImageData(0, 0, source.width, source.height);
    const color = getPixelColor(imageData, opts.seedPoint.x, opts.seedPoint.y, opts.alphaThreshold ?? 16);
    if (color) opts.seedColor = color;
  }
  // Fall through to edge-connected (same algorithm, just with explicit seedColor)
  return removeBackgroundEdgeConnected(source, opts);
}

// ─── Corner threshold (legacy) ────────────────────────────────────

/**
 * Legacy mode: detect background from borders, remove ALL pixels
 * within threshold regardless of connectivity.
 */
export function removeBackgroundCornerThreshold(
  source: HTMLCanvasElement,
  options: BackgroundRemovalOptions
): HTMLCanvasElement {
  const result = document.createElement('canvas');
  result.width = source.width;
  result.height = source.height;
  const srcCtx = source.getContext('2d')!;
  const imageData = srcCtx.getImageData(0, 0, source.width, source.height);
  const { data, width, height } = imageData;

  const normalizedThreshold = options.threshold / 100;
  const alphaThresh = options.alphaThreshold ?? 16;

  const bgColor = options.seedColor ?? robustDetectBorderBackgroundColor(imageData, alphaThresh);

  if (options.hardAlpha && !options.feather) {
    // Simple on/off — no feather zone
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < alphaThresh) continue;
      const dist = colorDistance({ r: data[i], g: data[i + 1], b: data[i + 2] }, bgColor);
      if (dist <= normalizedThreshold) {
        data[i + 3] = 0;
      }
    }
  } else {
    // With feather zone
    const featherWidth = Math.max(0.02, normalizedThreshold * 0.15);
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < alphaThresh) continue;
      const dist = colorDistance({ r: data[i], g: data[i + 1], b: data[i + 2] }, bgColor);
      if (dist <= normalizedThreshold - featherWidth) {
        data[i + 3] = 0;
      } else if (dist < normalizedThreshold + featherWidth) {
        const t = (dist - (normalizedThreshold - featherWidth)) / (2 * featherWidth);
        data[i + 3] = Math.round(data[i + 3] * t);
      }
    }
  }

  // Edge cleanup
  if (options.edgeCleanup) {
    const cleanupThreshold = normalizedThreshold * 0.75;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        if (data[idx + 3] === 0) continue;
        const r = data[idx]; const g = data[idx + 1]; const b = data[idx + 2];
        if (colorDistance({ r, g, b }, bgColor) < cleanupThreshold) {
          if (hasTransparentNeighbor(data, width, height, x, y)) {
            data[idx + 3] = 0;
          }
        }
      }
    }
  }

  const dstCtx = result.getContext('2d')!;
  dstCtx.putImageData(imageData, 0, 0);
  return result;
}

// ─── Compabitility shim for old removeBackground ──────────────────

export function removeBackground(
  source: HTMLCanvasElement,
  backgroundColor: RGBColor,
  threshold: number
): HTMLCanvasElement {
  return removeBackgroundCornerThreshold(source, {
    mode: 'corner-threshold',
    threshold,
    hardAlpha: false,
    feather: true,
    edgeCleanup: false,
    seedColor: backgroundColor,
  });
}

// ─── Unified entry point ──────────────────────────────────────────

export function applyBackgroundRemoval(
  source: HTMLCanvasElement,
  options: BackgroundRemovalOptions
): HTMLCanvasElement {
  switch (options.mode) {
    case 'edge-connected':
      return removeBackgroundEdgeConnected(source, options);
    case 'magic-wand':
      return removeBackgroundMagicWand(source, options);
    case 'corner-threshold':
      return removeBackgroundCornerThreshold(source, options);
  }
}
