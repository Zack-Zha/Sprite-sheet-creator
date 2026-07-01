import { useState, useCallback, useRef, useMemo } from 'react';
import type { SpriteSheetParams, CellState, AnimationTrack, BackgroundRemovalOptions } from '../types';
import {
  loadImage, sliceFrames, scaleCanvasNearestNeighbor,
  autoDetectScaleFactor, calculateGrid,
} from '../utils/canvas';
import { applyBackgroundRemoval, getPixelColor } from '../utils/background';

const DEFAULT_BG_OPTIONS: BackgroundRemovalOptions = {
  mode: 'edge-connected',
  threshold: 12,
  hardAlpha: true,
  feather: false,
  edgeCleanup: true,
  alphaThreshold: 16,
};

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
  bgOptions: BackgroundRemovalOptions;
  bgEnabled: boolean;
  isProcessing: boolean;
  hasImage: boolean;
  hasFrames: boolean;
  tracks: Record<string, AnimationTrack>;
  activeTrackId: CellState;
  gridMap: Record<string, CellState | undefined>;
  isPickingBackground: boolean;
  // Actions
  setParams: (params: SpriteSheetParams) => void;
  handleFile: (file: File) => Promise<void>;
  processFrames: () => Promise<void>;
  setBgOptions: (options: BackgroundRemovalOptions) => void;
  setBgEnabled: (enabled: boolean) => void;
  setMagicWandSeed: (x: number, y: number) => void;
  clearMagicWandSeed: () => void;
  startPickingBackground: () => void;
  cancelPickingBackground: () => void;
  toggleCellState: (row: number, col: number) => void;
  setActiveTrackId: (id: CellState) => void;
  updateTrackFps: (trackId: string, fps: number) => void;
  clearTrack: (trackId: string) => void;
  sortTrackByGrid: (trackId: string) => void;
}

const DEFAULT_TRACKS: Record<string, AnimationTrack> = {
  idle:   { id: 'idle',   name: '待机', frameIndices: [], fps: 8 },
  walk:   { id: 'walk',   name: '行走', frameIndices: [], fps: 8 },
  attack: { id: 'attack', name: '攻击', frameIndices: [], fps: 8 },
};

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
    rows: 0, cols: 0, frameWidth: 32, frameHeight: 32, fps: 8, scaleFactor: 'auto',
  });
  const [bgOptions, setBgOptions] = useState<BackgroundRemovalOptions>({ ...DEFAULT_BG_OPTIONS });
  const [bgEnabled, setBgEnabledState] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPickingBackground, setIsPickingBackground] = useState(false);

  const [tracks, setTracks] = useState<Record<string, AnimationTrack>>({ ...DEFAULT_TRACKS });
  const [activeTrackId, setActiveTrackId] = useState<CellState>('idle');

  const rawFramesRef = useRef<HTMLCanvasElement[]>([]);
  const bgOptionsRef = useRef<BackgroundRemovalOptions>({ ...DEFAULT_BG_OPTIONS });
  const bgEnabledRef = useRef(true);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const scaledImageRef = useRef<HTMLCanvasElement | null>(null);
  const tracksRef = useRef<Record<string, AnimationTrack>>({ ...DEFAULT_TRACKS });
  const activeTrackIdRef = useRef<CellState>('idle');
  const paramsRef = useRef(params);
  paramsRef.current = params;

  const hasImage = originalImage !== null;
  const hasFrames = processedFrames.length > 0;

  const gridMap = useMemo(() => {
    const map: Record<string, CellState | undefined> = {};
    const cols = params.cols || 1;
    for (const track of Object.values(tracks)) {
      for (const idx of track.frameIndices) {
        const row = Math.floor(idx / cols);
        const col = idx % cols;
        map[`${row}_${col}`] = track.id as CellState;
      }
    }
    return map;
  }, [tracks, params.cols]);

  // Apply bg removal per frame with current options
  const applyBg = useCallback(
    (frames: HTMLCanvasElement[], opts: BackgroundRemovalOptions): HTMLCanvasElement[] => {
      if (frames.length === 0) return [];
      return frames.map((frame) => applyBackgroundRemoval(frame, opts));
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
      setScaledWidth(0); setScaledHeight(0);
      setDetectedScaleFactor(1);
      rawFramesRef.current = [];
      scaledImageRef.current = null;
      const fresh = { ...DEFAULT_TRACKS };
      setTracks(fresh); tracksRef.current = fresh;
      setActiveTrackId('idle'); activeTrackIdRef.current = 'idle';
      // Reset bg options
      const opts = { ...DEFAULT_BG_OPTIONS };
      setBgOptions(opts); bgOptionsRef.current = opts;
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

      let actualFactor: number;
      if (params.scaleFactor === 'auto') {
        actualFactor = autoDetectScaleFactor(img.naturalWidth, img.naturalHeight, params.frameWidth, params.frameHeight);
      } else {
        actualFactor = params.scaleFactor;
      }
      setDetectedScaleFactor(actualFactor);

      const scaled = scaleCanvasNearestNeighbor(img, actualFactor);
      scaledImageRef.current = scaled;
      setScaledImage(scaled);
      setScaledWidth(scaled.width); setScaledHeight(scaled.height);

      const { rows, cols } = calculateGrid(scaled.width, scaled.height, params.frameWidth, params.frameHeight);
      const updatedParams = { ...params, rows, cols };
      setParams(updatedParams);

      const frames = sliceFrames(scaled, rows, cols, params.frameWidth, params.frameHeight);
      rawFramesRef.current = frames;
      setRawFrames(frames);

      if (bgEnabledRef.current) {
        setProcessedFrames(applyBg(frames, bgOptionsRef.current));
      } else {
        setProcessedFrames(frames.map((f) => {
          const c = document.createElement('canvas');
          c.width = f.width; c.height = f.height;
          c.getContext('2d')!.drawImage(f, 0, 0);
          return c;
        }));
      }

      const fresh = { ...DEFAULT_TRACKS };
      setTracks(fresh); tracksRef.current = fresh;
      setActiveTrackId('idle'); activeTrackIdRef.current = 'idle';
    } catch (err) {
      console.error('处理失败：', err);
    } finally {
      setIsProcessing(false);
    }
  }, [params, applyBg]);

  // Re-apply bg removal with new options (from raw frames)
  const reprocessBg = useCallback((opts: BackgroundRemovalOptions) => {
    const frames = rawFramesRef.current;
    if (frames.length > 0 && bgEnabledRef.current) {
      setProcessedFrames(applyBg(frames, opts));
    }
  }, [applyBg]);

  const handleSetBgOptions = useCallback((opts: BackgroundRemovalOptions) => {
    setBgOptions(opts);
    bgOptionsRef.current = opts;
    reprocessBg(opts);
  }, [reprocessBg]);

  const handleSetBgEnabled = useCallback((enabled: boolean) => {
    bgEnabledRef.current = enabled;
    setBgEnabledState(enabled);
    const frames = rawFramesRef.current;
    if (frames.length > 0) {
      if (enabled) {
        setProcessedFrames(applyBg(frames, bgOptionsRef.current));
      } else {
        setProcessedFrames(frames.map((f) => {
          const c = document.createElement('canvas');
          c.width = f.width; c.height = f.height;
          c.getContext('2d')!.drawImage(f, 0, 0);
          return c;
        }));
      }
    }
  }, [applyBg]);

  // Magic wand seed from scaled image coordinates
  const setMagicWandSeed = useCallback((x: number, y: number) => {
    const scaled = scaledImageRef.current;
    if (!scaled) return;
    const ctx = scaled.getContext('2d');
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, scaled.width, scaled.height);
    const color = getPixelColor(imageData, x, y, 16);
    if (!color) return;

    const newOpts: BackgroundRemovalOptions = {
      ...bgOptionsRef.current,
      mode: 'magic-wand',
      seedPoint: { x, y },
      seedColor: color,
    };
    setBgOptions(newOpts);
    bgOptionsRef.current = newOpts;
    setIsPickingBackground(false);
    reprocessBg(newOpts);
  }, [reprocessBg]);

  const clearMagicWandSeed = useCallback(() => {
    const newOpts: BackgroundRemovalOptions = {
      ...bgOptionsRef.current,
      mode: 'edge-connected',
      seedPoint: undefined,
      seedColor: undefined,
    };
    setBgOptions(newOpts);
    bgOptionsRef.current = newOpts;
    reprocessBg(newOpts);
  }, [reprocessBg]);

  const startPickingBackground = useCallback(() => setIsPickingBackground(true), []);
  const cancelPickingBackground = useCallback(() => setIsPickingBackground(false), []);

  // Track cell toggle
  const toggleCellState = useCallback((row: number, col: number) => {
    const cols = paramsRef.current.cols || 1;
    const frameIndex = row * cols + col;
    const trackId = activeTrackIdRef.current;
    setTracks((prev) => {
      const next: Record<string, AnimationTrack> = {};
      for (const [id, t] of Object.entries(prev)) {
        next[id] = { ...t, frameIndices: t.frameIndices.filter((i) => i !== frameIndex) };
      }
      const active = { ...next[trackId] };
      const idx = active.frameIndices.indexOf(frameIndex);
      if (idx >= 0) {
        active.frameIndices = active.frameIndices.filter((_, i) => i !== idx);
      } else {
        active.frameIndices = [...active.frameIndices, frameIndex];
      }
      next[trackId] = active;
      tracksRef.current = next;
      return next;
    });
  }, []);

  const handleSetActiveTrackId = useCallback((id: CellState) => {
    setActiveTrackId(id); activeTrackIdRef.current = id;
  }, []);

  const updateTrackFps = useCallback((trackId: string, fps: number) => {
    const safe = Math.min(60, Math.max(1, Number(fps) || 8));
    setTracks((prev) => {
      const next = { ...prev, [trackId]: { ...prev[trackId], fps: safe } };
      tracksRef.current = next; return next;
    });
  }, []);

  const clearTrack = useCallback((trackId: string) => {
    setTracks((prev) => {
      const next = { ...prev, [trackId]: { ...prev[trackId], frameIndices: [] } };
      tracksRef.current = next; return next;
    });
  }, []);

  const sortTrackByGrid = useCallback((trackId: string) => {
    setTracks((prev) => {
      const track = prev[trackId];
      if (!track) return prev;
      const sorted = [...track.frameIndices].sort((a, b) => a - b);
      const next = { ...prev, [trackId]: { ...track, frameIndices: sorted } };
      tracksRef.current = next; return next;
    });
  }, []);

  return {
    originalImage, scaledImage, rawFrames, processedFrames,
    imageWidth, imageHeight, scaledWidth, scaledHeight,
    params, detectedScaleFactor, bgOptions, bgEnabled,
    isProcessing, hasImage, hasFrames,
    tracks, activeTrackId, gridMap,
    isPickingBackground,
    setParams, handleFile, processFrames,
    setBgOptions: handleSetBgOptions, setBgEnabled: handleSetBgEnabled,
    setMagicWandSeed, clearMagicWandSeed,
    startPickingBackground, cancelPickingBackground,
    toggleCellState, setActiveTrackId: handleSetActiveTrackId,
    updateTrackFps, clearTrack, sortTrackByGrid,
  };
}
