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
 * Bypasses Vite's dynamic import pipeline entirely — no
 * /node_modules/.vite/deps/gif__js__optimized.js request.
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
 * Export frames as an animated GIF using gif.js.optimized.
 * Main lib loaded via ?url + <script> tag → window.GIF.
 * Worker loaded via ?url → static asset.
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

  // ── Load GIF constructor via UMD script tag ───────────────────
  const GIFCtor = await loadGifJs();

  if (typeof GIFCtor !== 'function') {
    throw new Error('window.GIF 不是构造函数');
  }

  // ── Create encoder ───────────────────────────────────────────
  const gif = new GIFCtor({
    workers: 2,
    quality: 10,
    width,
    height,
    workerScript: gifWorkerUrl,
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
      gif.addFrame(frame, { delay, copy: true });
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
