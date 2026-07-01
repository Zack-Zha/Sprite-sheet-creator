import { combineFramesToGrid } from './canvas';

/**
 * Export frames as a transparent PNG sprite sheet.
 * Arranges frames into a grid, outputs as PNG blob.
 */
export function exportPng(
  frames: HTMLCanvasElement[],
  cols: number,
  frameWidth: number,
  frameHeight: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const grid = combineFramesToGrid(frames, cols, frameWidth, frameHeight);
    grid.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create PNG blob'));
        }
      },
      'image/png'
    );
  });
}

/**
 * Export frames as an animated GIF using gif.js.optimized.
 * frameDelay = 1000 / fps (milliseconds per frame)
 */
export async function exportGif(
  frames: HTMLCanvasElement[],
  fps: number,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  // Dynamic import of gif.js.optimized
  const GIFModule = await import('gif.js.optimized');
  const GIF = GIFModule.default;

  const delay = Math.round(1000 / fps);

  const gif = new GIF({
    workers: 2,
    quality: 10,
    width: frames[0]?.width ?? 0,
    height: frames[0]?.height ?? 0,
    workerScript: '/gif.worker.js',
    transparent: null, // Preserve transparency from source canvases
  });

  if (onProgress) {
    gif.on('progress', (p: number) => {
      onProgress(p);
    });
  }

  return new Promise((resolve, reject) => {
    gif.on('finished', (blob: Blob) => {
      resolve(blob);
    });

    gif.on('error', (err: Error) => {
      reject(err);
    });

    for (const frame of frames) {
      gif.addFrame(frame, { delay, copy: true });
    }

    gif.render();
  });
}

/**
 * Trigger a file download in the browser.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
