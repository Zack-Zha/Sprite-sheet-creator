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

export interface ProcessingState {
  originalImage: HTMLImageElement | null;
  rawFrames: HTMLCanvasElement[];
  processedFrames: HTMLCanvasElement[];
  imageWidth: number;
  imageHeight: number;
}

/** Cell state tags for animation grouping */
export type CellState = 'idle' | 'walk' | 'attack';

/** Grid map: "row_col" -> CellState */
export type GridMap = Record<string, CellState | undefined>;

/** Animation group definition */
export interface AnimationGroup {
  name: string;
  state: CellState;
  frameIndices: number[];
  fps: number;
}
