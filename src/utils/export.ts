import { combineFramesToGrid } from './canvas';
// Vite ?url import — automatically bundles the worker as a static asset
import gifWorkerUrl from 'gif.js.optimized/dist/gif.worker.js?url';

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
 * Worker is loaded via Vite ?url import — works in dev, preview, and production build.
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

  // Validate all frames have same size
  for (let i = 0; i < frames.length; i++) {
    if (frames[i].width !== width || frames[i].height !== height) {
      throw new Error(
        `第 ${i} 帧尺寸不一致: 期望 ${width}x${height}，实际 ${frames[i].width}x${frames[i].height}`
      );
    }
  }

  // ── Verify worker reachable ──────────────────────────────────
  try {
    const res = await fetch(gifWorkerUrl, { method: 'HEAD' });
    if (!res.ok) {
      throw new Error(`Worker 文件不可访问 (HTTP ${res.status}): ${gifWorkerUrl}`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('Worker 文件不可访问')) throw err;
    throw new Error(
      `GIF Worker 加载失败: ${gifWorkerUrl}。${err instanceof Error ? err.message : String(err)}`
    );
  }

  // ── Import GIF constructor (handle ESM/CJS interop) ──────────
  const GIFModule = await import('gif.js.optimized');
  const GIFCtor = (GIFModule as any).default ?? GIFModule;

  if (typeof GIFCtor !== 'function') {
    throw new Error('gif.js.optimized 未正确导出 GIF 构造函数');
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
