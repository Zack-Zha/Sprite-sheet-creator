import { useState, useCallback, useRef } from 'react';
import type { SpriteSheetParams, GridMap, AnimationGroup, CellState } from '../types';
import {
  loadImage,
  sliceFrames,
  scaleCanvasNearestNeighbor,
  autoDetectScaleFactor,
  calculateGrid,
} from '../utils/canvas';
import { detectBackgroundColor, removeBackground } from '../utils/background';

interface UseSpriteProcessorReturn {
  originalImage: HTMLImageElement | null;
  scaledImage: HTMLCanvasElement | null;
  rawFrames: HTMLCanvasElement[];
  processedFrames: HTMLCanvasElement[];
  imageWidth: number;
  imageHeight: number;
  scaledWidth: number;
  scaledHeight: number;
  params: SpriteSheetParams;
  detectedScaleFactor: number;
  bgThreshold: number;
  bgEnabled: boolean;
  isProcessing: boolean;
  hasImage: boolean;
  hasFrames: boolean;
  gridMap: GridMap;
  groups: AnimationGroup[];
  activeGroup: string | null;
  // Actions
  setParams: (params: SpriteSheetParams) => void;
  handleFile: (file: File) => Promise<void>;
  processFrames: () => Promise<void>;
  setBgThreshold: (value: number) => void;
  setBgEnabled: (enabled: boolean) => void;
  toggleCellState: (row: number, col: number, state: CellState) => void;
  setCellState: (row: number, col: number, state: CellState | undefined) => void;
  createGroup: (name: string, state: CellState, fps: number) => void;
  deleteGroup: (name: string) => void;
  setActiveGroup: (name: string | null) => void;
  getGroupFrames: (groupName: string) => HTMLCanvasElement[];
  getGroupFps: (groupName: string) => number;
}

export function useSpriteProcessor(): UseSpriteProcessorReturn {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [scaledImage, setScaledImage] = useState<HTMLCanvasElement | null>(null);
  const [imageWidth, setImageWidth] = useState(0);
  const [imageHeight, setImageHeight] = useState(0);
  const [scaledWidth, setScaledWidth] = useState(0);
  const [scaledHeight, setScaledHeight] = useState(0);
  const [detectedScaleFactor, setDetectedScaleFactor] = useState(1);
  const [rawFrames, setRawFrames] = useState<HTMLCanvasElement[]>([]);
  const [processedFrames, setProcessedFrames] = useState<HTMLCanvasElement[]>([]);
  const [params, setParams] = useState<SpriteSheetParams>({
    rows: 0,
    cols: 0,
    frameWidth: 32,
    frameHeight: 32,
    fps: 8,
    scaleFactor: 'auto',
  });
  const [bgThreshold, setBgThresholdState] = useState(30);
  const [bgEnabled, setBgEnabledState] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gridMap, setGridMap] = useState<GridMap>({});
  const [groups, setGroups] = useState<AnimationGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const rawFramesRef = useRef<HTMLCanvasElement[]>([]);
  const bgThresholdRef = useRef(30);
  const bgEnabledRef = useRef(true);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const scaledImageRef = useRef<HTMLCanvasElement | null>(null);
  const gridMapRef = useRef<GridMap>({});
  const groupsRef = useRef<AnimationGroup[]>([]);

  const hasImage = originalImage !== null;
  const hasFrames = processedFrames.length > 0;

  // Apply background removal to raw frames
  const applyBgRemoval = useCallback(
    (frames: HTMLCanvasElement[], threshold: number): HTMLCanvasElement[] => {
      if (frames.length === 0) return [];
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = frames[0].width;
      tmpCanvas.height = frames[0].height;
      const tmpCtx = tmpCanvas.getContext('2d')!;
      tmpCtx.drawImage(frames[0], 0, 0);
      const imageData = tmpCtx.getImageData(0, 0, tmpCanvas.width, tmpCanvas.height);
      const bgColor = detectBackgroundColor(imageData);
      return frames.map((frame) => removeBackground(frame, bgColor, threshold));
    },
    []
  );

  const handleFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    try {
      const img = await loadImage(file);
      imageRef.current = img;
      setOriginalImage(img);
      setImageWidth(img.naturalWidth);
      setImageHeight(img.naturalHeight);
      setRawFrames([]);
      setProcessedFrames([]);
      setScaledImage(null);
      setScaledWidth(0);
      setScaledHeight(0);
      setDetectedScaleFactor(1);
      setGridMap({});
      setGroups([]);
      setActiveGroup(null);
      rawFramesRef.current = [];
      gridMapRef.current = {};
      groupsRef.current = [];
      scaledImageRef.current = null;
    } catch (err) {
      console.error('图片加载失败：', err);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const processFrames = useCallback(async () => {
    const img = imageRef.current;
    if (!img) return;

    setIsProcessing(true);
    try {
      await new Promise((r) => setTimeout(r, 50));

      // Step 1: Determine scale factor
      let actualFactor: number;
      if (params.scaleFactor === 'auto') {
        actualFactor = autoDetectScaleFactor(
          img.naturalWidth,
          img.naturalHeight,
          params.frameWidth,
          params.frameHeight
        );
      } else {
        actualFactor = params.scaleFactor;
      }
      setDetectedScaleFactor(actualFactor);

      // Step 2: Scale the image (pixel-perfect nearest-neighbor)
      const scaled = scaleCanvasNearestNeighbor(img, actualFactor);
      scaledImageRef.current = scaled;
      setScaledImage(scaled);
      setScaledWidth(scaled.width);
      setScaledHeight(scaled.height);

      // Step 3: Auto-calculate grid dimensions
      const { rows, cols } = calculateGrid(
        scaled.width,
        scaled.height,
        params.frameWidth,
        params.frameHeight
      );

      // Update params with auto-calculated rows/cols
      const updatedParams = { ...params, rows, cols };
      setParams(updatedParams);

      // Step 4: Slice frames from SCALED image
      const frames = sliceFrames(scaled, rows, cols, params.frameWidth, params.frameHeight);
      rawFramesRef.current = frames;
      setRawFrames(frames);

      // Step 5: Background removal
      if (bgEnabledRef.current) {
        const processed = applyBgRemoval(frames, bgThresholdRef.current);
        setProcessedFrames(processed);
      } else {
        const cloned = frames.map((f) => {
          const c = document.createElement('canvas');
          c.width = f.width;
          c.height = f.height;
          c.getContext('2d')!.drawImage(f, 0, 0);
          return c;
        });
        setProcessedFrames(cloned);
      }

      // Initialize empty grid map
      const newGridMap: GridMap = {};
      setGridMap(newGridMap);
      gridMapRef.current = newGridMap;
    } catch (err) {
      console.error('处理失败：', err);
    } finally {
      setIsProcessing(false);
    }
  }, [params, applyBgRemoval]);

  const setBgThreshold = useCallback(
    (value: number) => {
      bgThresholdRef.current = value;
      setBgThresholdState(value);
      const frames = rawFramesRef.current;
      if (frames.length > 0 && bgEnabledRef.current) {
        const processed = applyBgRemoval(frames, value);
        setProcessedFrames(processed);
      }
    },
    [applyBgRemoval]
  );

  const setBgEnabled = useCallback(
    (enabled: boolean) => {
      bgEnabledRef.current = enabled;
      setBgEnabledState(enabled);
      const frames = rawFramesRef.current;
      if (frames.length > 0) {
        if (enabled) {
          const processed = applyBgRemoval(frames, bgThresholdRef.current);
          setProcessedFrames(processed);
        } else {
          const cloned = frames.map((f) => {
            const c = document.createElement('canvas');
            c.width = f.width;
            c.height = f.height;
            c.getContext('2d')!.drawImage(f, 0, 0);
            return c;
          });
          setProcessedFrames(cloned);
        }
      }
    },
    [applyBgRemoval]
  );

  // Grid cell state management
  const toggleCellState = useCallback((row: number, col: number, state: CellState) => {
    const key = `${row}_${col}`;
    setGridMap((prev) => {
      const current = prev[key];
      const next = { ...prev };
      if (current === state) {
        delete next[key];
      } else {
        next[key] = state;
      }
      gridMapRef.current = next;
      return next;
    });
  }, []);

  const setCellState = useCallback((row: number, col: number, state: CellState | undefined) => {
    const key = `${row}_${col}`;
    setGridMap((prev) => {
      const next = { ...prev };
      if (state) {
        next[key] = state;
      } else {
        delete next[key];
      }
      gridMapRef.current = next;
      return next;
    });
  }, []);

  // Animation group management
  const createGroup = useCallback(
    (name: string, state: CellState, fps: number) => {
      const gm = gridMapRef.current;
      const indices: number[] = [];
      const cols = params.cols || 1;

      // Collect all cell indices matching the state
      for (const [key, cellState] of Object.entries(gm)) {
        if (cellState === state) {
          const [r, c] = key.split('_').map(Number);
          const index = r * cols + c;
          indices.push(index);
        }
      }

      if (indices.length === 0) return;

      indices.sort((a, b) => a - b);

      setGroups((prev) => {
        const filtered = prev.filter((g) => g.name !== name);
        const newGroup: AnimationGroup = {
          name,
          state,
          frameIndices: indices,
          fps,
        };
        const updated = [...filtered, newGroup];
        groupsRef.current = updated;
        return updated;
      });
    },
    [params.cols]
  );

  const deleteGroup = useCallback((name: string) => {
    setGroups((prev) => {
      const updated = prev.filter((g) => g.name !== name);
      groupsRef.current = updated;
      return updated;
    });
    setActiveGroup((prev) => (prev === name ? null : prev));
  }, []);

  const getGroupFrames = useCallback(
    (groupName: string): HTMLCanvasElement[] => {
      const group = groupsRef.current.find((g) => g.name === groupName);
      if (!group) return [];
      return group.frameIndices
        .map((i) => processedFrames[i])
        .filter(Boolean);
    },
    [processedFrames]
  );

  const getGroupFps = useCallback(
    (groupName: string): number => {
      const group = groupsRef.current.find((g) => g.name === groupName);
      return group?.fps ?? 8;
    },
    []
  );

  return {
    originalImage,
    scaledImage,
    rawFrames,
    processedFrames,
    imageWidth,
    imageHeight,
    scaledWidth,
    scaledHeight,
    params,
    detectedScaleFactor,
    bgThreshold,
    bgEnabled,
    isProcessing,
    hasImage,
    hasFrames,
    gridMap,
    groups,
    activeGroup,
    setParams,
    handleFile,
    processFrames,
    setBgThreshold,
    setBgEnabled,
    toggleCellState,
    setCellState,
    createGroup,
    deleteGroup,
    setActiveGroup,
    getGroupFrames,
    getGroupFps,
  };
}
