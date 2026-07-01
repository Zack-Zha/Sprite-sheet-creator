export interface SpriteSheetParams {
  rows: number;
  cols: number;
  frameWidth: number;
  frameHeight: number;
  fps: number;
  scaleFactor: number | 'auto';
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface Point {
  x: number;
  y: number;
}

export type BackgroundRemovalMode = 'edge-connected' | 'magic-wand' | 'corner-threshold';

export interface BackgroundRemovalOptions {
  mode: BackgroundRemovalMode;
  threshold: number;       // 0-100
  hardAlpha: boolean;      // default true for pixel art
  feather: boolean;        // default false
  edgeCleanup: boolean;    // default true
  seedPoint?: Point;
  seedColor?: RGBColor;
  alphaThreshold?: number; // default 16
}

export interface ProcessingState {
  originalImage: HTMLImageElement | null;
  rawFrames: HTMLCanvasElement[];
  processedFrames: HTMLCanvasElement[];
  imageWidth: number;
  imageHeight: number;
}

/** Cell state tags for animation tracks */
export type CellState = 'idle' | 'walk' | 'attack';

export type AnimationTrackId = 'idle' | 'walk' | 'attack' | string;

export interface AnimationTrack {
  id: AnimationTrackId;
  name: string;
  frameIndices: number[];
  fps: number;
}
