import { useRef, useEffect, useMemo } from 'react';
import { useAnimation } from '../hooks/useAnimation';
import type { CellState, AnimationTrack } from '../types';
import './AnimationPreview.css';

interface AnimationPreviewProps {
  frames: HTMLCanvasElement[];
  tracks: Record<string, AnimationTrack>;
  activeTrackId: CellState;
}

export function AnimationPreview({ frames, tracks, activeTrackId }: AnimationPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const activeTrack = tracks[activeTrackId];
  const activeFps = activeTrack?.fps ?? 8;

  // Stable activeFrames via useMemo — don't create new array every render
  const activeFrames = useMemo(() => {
    if (!activeTrack) return [];
    return activeTrack.frameIndices
      .map((i) => frames[i])
      .filter(Boolean) as HTMLCanvasElement[];
  }, [frames, activeTrack?.frameIndices]);

  // Stable animationKey — only resets when track content actually changes
  const animationKey = useMemo(() => {
    if (!activeTrack) return 'empty';
    return `${activeTrackId}:${activeTrack.frameIndices.join(',')}`;
  }, [activeTrackId, activeTrack?.frameIndices]);

  const { isPlaying, togglePlay, currentFrame, totalFrames } = useAnimation(
    canvasRef, activeFrames, activeFps, animationKey
  );

  const hasFrames = activeFrames.length > 0;
  const canvasWidth = activeFrames[0]?.width ?? 0;
  const canvasHeight = activeFrames[0]?.height ?? 0;

  const maxDisplayWidth = 500;
  const maxDisplayHeight = 400;
  const scale = Math.min(1,
    maxDisplayWidth / (canvasWidth || 1),
    maxDisplayHeight / (canvasHeight || 1)
  );

  useEffect(() => {
    if (hasFrames && canvasRef.current) {
      canvasRef.current.width = canvasWidth;
      canvasRef.current.height = canvasHeight;
    }
  }, [hasFrames, canvasWidth, canvasHeight]);

  const trackName = activeTrackId === 'idle' ? '待机' : activeTrackId === 'walk' ? '行走' : '攻击';

  return (
    <div className="animation-preview">
      <h3 className="animation-preview__title">
        动画预览
        {hasFrames && (
          <span className="animation-preview__counter">
            第 {currentFrame + 1} 帧 / 共 {totalFrames} 帧
            <span className="animation-preview__group-badge">[{trackName}]</span>
          </span>
        )}
      </h3>

      <div className="animation-preview__canvas-wrapper">
        {hasFrames ? (
          <canvas
            ref={canvasRef}
            className="animation-preview__canvas"
            style={{
              width: Math.round(canvasWidth * scale),
              height: Math.round(canvasHeight * scale),
              imageRendering: scale < 0.5 ? 'pixelated' : 'auto',
            }}
          />
        ) : (
          <div className="animation-preview__empty">
            <span className="animation-preview__empty-icon">🎬</span>
            <p>暂无帧可预览</p>
            <p className="animation-preview__empty-hint">
              请在网格中选择若干帧来预览 {trackName} 动画
            </p>
          </div>
        )}
      </div>

      {hasFrames && (
        <div className="animation-preview__controls">
          <button className="animation-preview__play-btn" onClick={togglePlay}>
            {isPlaying ? '⏸ 暂停' : '▶ 播放'}
          </button>
          <span className="animation-preview__fps-display">{activeFps} FPS</span>
        </div>
      )}
    </div>
  );
}
