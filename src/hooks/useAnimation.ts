import { useRef, useEffect, useCallback, useState } from 'react';

interface UseAnimationReturn {
  isPlaying: boolean;
  togglePlay: () => void;
  currentFrame: number;
  totalFrames: number;
}

/**
 * FPS-controlled animation hook using requestAnimationFrame.
 * Uses time-based frame stepping with drift compensation for precise frame timing.
 */
export function useAnimation(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  frames: HTMLCanvasElement[],
  fps: number
): UseAnimationReturn {
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentFrame, setCurrentFrame] = useState(0);
  const rafRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const frameIndexRef = useRef<number>(0);

  const totalFrames = frames.length;

  const drawFrame = useCallback(
    (index: number) => {
      const canvas = canvasRef.current;
      if (!canvas || frames.length === 0) return;
      const frame = frames[index];
      if (!frame) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(frame, 0, 0);
    },
    [canvasRef, frames]
  );

  useEffect(() => {
    // Reset when frames change
    frameIndexRef.current = 0;
    setCurrentFrame(0);
    setIsPlaying(true);
    lastFrameTimeRef.current = 0;
  }, [frames]);

  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;

    // Set canvas dimensions from first frame
    const canvas = canvasRef.current;
    if (canvas && frames[0]) {
      canvas.width = frames[0].width;
      canvas.height = frames[0].height;
    }

    const tick = (now: number) => {
      const frameDelay = 1000 / fps;

      if (lastFrameTimeRef.current === 0) {
        lastFrameTimeRef.current = now;
      }

      const elapsed = now - lastFrameTimeRef.current;

      if (elapsed >= frameDelay) {
        // Drift compensation: subtract excess time to keep average FPS correct
        lastFrameTimeRef.current = now - (elapsed % frameDelay);

        const nextIndex = (frameIndexRef.current + 1) % frames.length;
        frameIndexRef.current = nextIndex;
        setCurrentFrame(nextIndex);
        drawFrame(nextIndex);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isPlaying, fps, frames, canvasRef, drawFrame]);

  // Draw initial frame
  useEffect(() => {
    if (frames.length > 0 && canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.width = frames[0].width;
      canvas.height = frames[0].height;
      drawFrame(0);
    }
  }, [frames, canvasRef, drawFrame]);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  return { isPlaying, togglePlay, currentFrame, totalFrames };
}
