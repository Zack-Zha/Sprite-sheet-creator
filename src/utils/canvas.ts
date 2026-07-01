/** Load a File into an HTMLImageElement */
export function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/** Create an offscreen canvas with pixel-perfect settings */
export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return canvas;
}

/**
 * Scale a canvas/image down by an integer factor using NEAREST-NEIGHBOR.
 * No interpolation — preserves pixel-art jagged edges.
 * For 4x sprites, scaleFactor=4 reduces 128x128 → 32x32.
 */
export function scaleCanvasNearestNeighbor(
  source: HTMLCanvasElement | HTMLImageElement,
  scaleFactor: number
): HTMLCanvasElement {
  const factor = Math.round(scaleFactor);
  if (factor <= 1) {
    // No scaling needed — just copy
    const w = 'width' in source && source instanceof HTMLCanvasElement
      ? source.width : (source as HTMLImageElement).naturalWidth;
    const h = 'height' in source && source instanceof HTMLCanvasElement
      ? source.height : (source as HTMLImageElement).naturalHeight;
    const canvas = createCanvas(w, h);
    canvas.getContext('2d')!.drawImage(source, 0, 0);
    return canvas;
  }

  const srcW = 'width' in source && source instanceof HTMLCanvasElement
    ? source.width : (source as HTMLImageElement).naturalWidth;
  const srcH = 'height' in source && source instanceof HTMLCanvasElement
    ? source.height : (source as HTMLImageElement).naturalHeight;

  const newWidth = Math.floor(srcW / factor);
  const newHeight = Math.floor(srcH / factor);

  const canvas = createCanvas(newWidth, newHeight);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  // DrawImage with imageSmoothingEnabled=false = nearest-neighbor downscale
  ctx.drawImage(source, 0, 0, newWidth, newHeight);
  return canvas;
}

/**
 * Auto-detect the best integer scale factor.
 * Tries factors 8→1, returns the largest factor where:
 *   scaledW % frameWidth === 0 && scaledH % frameHeight === 0
 * Returns 1 if no factor satisfies the condition (unity scale).
 */
export function autoDetectScaleFactor(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number
): number {
  for (let factor = 8; factor >= 2; factor--) {
    const scaledW = Math.floor(imageWidth / factor);
    const scaledH = Math.floor(imageHeight / factor);
    if (scaledW % frameWidth === 0 && scaledH % frameHeight === 0) {
      return factor;
    }
  }
  return 1;
}

/**
 * Calculate grid dimensions from image size and frame size.
 */
export function calculateGrid(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number
): { rows: number; cols: number } {
  const cols = Math.floor(imageWidth / frameWidth);
  const rows = Math.floor(imageHeight / frameHeight);
  return { rows, cols };
}

/**
 * Slice a sprite sheet into individual frame canvases.
 * Pixel-perfect: no anti-aliasing, no interpolation.
 * Row-major order: row 0 left-to-right, then row 1, etc.
 */
export function sliceFrames(
  image: HTMLImageElement | HTMLCanvasElement,
  rows: number,
  cols: number,
  frameWidth: number,
  frameHeight: number
): HTMLCanvasElement[] {
  const frames: HTMLCanvasElement[] = [];
  const src = image instanceof HTMLCanvasElement ? image : image;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const frame = createCanvas(frameWidth, frameHeight);
      const ctx = frame.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;

      const sx = col * frameWidth;
      const sy = row * frameHeight;

      ctx.drawImage(
        src,
        sx, sy, frameWidth, frameHeight,   // source rect
        0, 0, frameWidth, frameHeight       // dest rect
      );

      frames.push(frame);
    }
  }

  return frames;
}

/**
 * Combine frames back into a grid sprite sheet.
 * Useful for exporting the processed frames as a PNG sprite sheet.
 */
export function combineFramesToGrid(
  frames: HTMLCanvasElement[],
  cols: number,
  frameWidth: number,
  frameHeight: number
): HTMLCanvasElement {
  const rows = Math.ceil(frames.length / cols);
  const canvas = createCanvas(cols * frameWidth, rows * frameHeight);
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;

  // Fill with transparent background
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  frames.forEach((frame, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    ctx.drawImage(frame, col * frameWidth, row * frameHeight);
  });

  return canvas;
}
