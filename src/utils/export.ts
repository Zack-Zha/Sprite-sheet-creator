import { combineFramesToGrid } from './canvas';

// ── Vite ?url imports — both main lib and worker as static assets ──
// Avoids Vite's dynamic import pre-bundling which fails on gif.js.optimized
import gifJsUrl from 'gif.js.optimized/dist/gif.js?url';
import gifWorkerUrl from 'gif.js.optimized/dist/gif.worker.js?url';

// ── Global type for window.GIF (set by UMD script tag) ────────────
declare global {
  interface Window {
    GIF?: any;
  }
}

/**
 * Load the gif.js UMD bundle via <script> tag.
 * Bypasses Vite's dynamic import pipeline entirely.
 */
async function loadGifJs(): Promise<any> {
  if (window.GIF) return window.GIF;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-gif-js="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error(`GIF script 加载失败: ${gifJsUrl}`)),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = gifJsUrl;
    script.async = true;
    script.dataset.gifJs = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`GIF script 加载失败: ${gifJsUrl}`));
    document.head.appendChild(script);
  });

  if (!window.GIF) {
    throw new Error('gif.js 已加载但 window.GIF 不可用');
  }

  return window.GIF;
}

// ── GIF transparency helpers ────────────────────────────────────

function rgbToInt(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b;
}

function intToRgb(value: number): { r: number; g: number; b: number } {
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

/**
 * Scan all frames for used opaque colors, then pick a color that
 * does NOT appear in the sprite data. GIF transparency works by
 * marking a single palette index as transparent, so we need a
 * "sacrificial" color that the artwork never uses.
 */
function pickTransparentColor(
  frames: HTMLCanvasElement[],
  alphaThreshold = 16
): number {
  const usedColors = new Set<number>();

  for (const frame of frames) {
    const ctx = frame.getContext('2d');
    if (!ctx) continue;
    const imageData = ctx.getImageData(0, 0, frame.width, frame.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] >= alphaThreshold) {
        usedColors.add(rgbToInt(data[i], data[i + 1], data[i + 2]));
      }
    }
  }

  // Candidates ordered by likelihood of NOT being in pixel art
  const candidates = [
    0xff00ff, // magenta
    0x00ff00, // green
    0x00ffff, // cyan
    0xff0000, // red
    0x0000ff, // blue
    0xffff00, // yellow
    0x010203,
    0xfefefe,
  ];

  for (const c of candidates) {
    if (!usedColors.has(c)) return c;
  }

  // All candidates used — search the RGB space
  for (let r = 1; r < 255; r += 17) {
    for (let g = 2; g < 255; g += 19) {
      for (let b = 3; b < 255; b += 23) {
        const color = rgbToInt(r, g, b);
        if (!usedColors.has(color)) return color;
      }
    }
  }

  return 0xff00ff; // ultimate fallback
}

/**
 * Create a new canvas with transparent pixels replaced by the
 * sacrificial transparentColor. Does NOT mutate the source.
 */
function prepareGifFrame(
  source: HTMLCanvasElement,
  width: number,
  height: number,
  transparentColor: number,
  alphaThreshold = 16
): HTMLCanvasElement {
  const transparentRgb = intToRgb(transparentColor);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('无法创建 GIF 帧 Canvas 上下文');
  }

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0);

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < alphaThreshold) {
      // Transparent pixel → fill with sacrifice color, full opacity
      data[i] = transparentRgb.r;
      data[i + 1] = transparentRgb.g;
      data[i + 2] = transparentRgb.b;
      data[i + 3] = 255;
    } else {
      // Opaque pixel → keep RGB, clamp alpha to 255
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// ── Public exports ──────────────────────────────────────────────

/** Export frames as a transparent PNG sprite sheet. */
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
        if (blob) resolve(blob);
        else reject(new Error('无法创建 PNG Blob'));
      },
      'image/png'
    );
  });
}

/**
 * Export frames as an animated GIF with transparency.
 * - Picks an unused color as the GIF transparent index
 * - Replaces alpha < 16 pixels with that color
 * - Sets gif.js `transparent` option
 */
export async function exportGif(
  frames: HTMLCanvasElement[],
  fps: number,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  // ── Validate inputs ──────────────────────────────────────────
  if (!frames.length) {
    throw new Error('没有可导出的帧');
  }

  const width = frames[0].width;
  const height = frames[0].height;

  if (!width || !height) {
    throw new Error(`无效的帧尺寸: ${width}x${height}`);
  }

  const safeFps = Math.min(60, Math.max(1, Number(fps) || 8));
  const delay = Math.max(20, Math.round(1000 / safeFps));

  for (let i = 0; i < frames.length; i++) {
    if (frames[i].width !== width || frames[i].height !== height) {
      throw new Error(
        `第 ${i} 帧尺寸不一致: 期望 ${width}x${height}，实际 ${frames[i].width}x${frames[i].height}`
      );
    }
  }

  // ── Pick transparent color ───────────────────────────────────
  const transparentColor = pickTransparentColor(frames);

  if (import.meta.env.DEV) {
    console.debug('[exportGif] transparentColor:', '#' + transparentColor.toString(16).padStart(6, '0'));
  }

  // ── Load GIF constructor via UMD script tag ───────────────────
  const GIFCtor = await loadGifJs();

  if (typeof GIFCtor !== 'function') {
    throw new Error('window.GIF 不是构造函数');
  }

  // ── Create encoder with transparency ──────────────────────────
  const gif = new GIFCtor({
    workers: 2,
    quality: 10,
    width,
    height,
    workerScript: gifWorkerUrl,
    transparent: transparentColor,
  });

  if (onProgress) {
    gif.on('progress', (p: number) => onProgress(p));
  }

  return new Promise<Blob>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new Error('GIF 导出超时（30 秒）。Worker 可能未能启动。'));
    }, 30000);

    gif.on('finished', (blob: Blob) => {
      window.clearTimeout(timeout);
      resolve(blob);
    });

    gif.on('error', (err: Error) => {
      window.clearTimeout(timeout);
      reject(err);
    });

    for (const frame of frames) {
      const prepared = prepareGifFrame(frame, width, height, transparentColor);
      gif.addFrame(prepared, { delay, copy: true, dispose: 2 });
    }

    gif.render();
  });
}

/** Trigger a file download in the browser. */
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
