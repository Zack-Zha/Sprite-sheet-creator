/// <reference types="vite/client" />

declare module 'gif.js.optimized' {
  interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    transparent?: string | null;
    background?: string;
    repeat?: number;
    dither?: boolean;
    debug?: boolean;
  }

  interface GIFFrameOptions {
    delay?: number;
    copy?: boolean;
    dispose?: number;
  }

  class GIF {
    constructor(options: GIFOptions);
    addFrame(
      element: HTMLCanvasElement | HTMLImageElement | ImageData | CanvasRenderingContext2D,
      options?: GIFFrameOptions
    ): void;
    on(event: 'finished', callback: (blob: Blob) => void): void;
    on(event: 'progress', callback: (progress: number) => void): void;
    on(event: 'error', callback: (error: Error) => void): void;
    render(): void;
    abort(): void;
  }

  export default GIF;
}
