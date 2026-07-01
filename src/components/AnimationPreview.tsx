import { useRef, useEffect } from 'react';
import { useAnimation } from '../hooks/useAnimation';
import type { AnimationGroup } from '../types';
import './AnimationPreview.css';

interface AnimationPreviewProps {
  frames: HTMLCanvasElement[];
  fps: number;
  groups?: AnimationGroup[];
  activeGroup?: string | null;
}

export function AnimationPreview({ frames, fps, groups = [], activeGroup = null }: AnimationPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Determine which frames to play
  const group = activeGroup ? groups.find((g) => g.name === activeGroup) : null;
  const activeFrames = group
    ? group.frameIndices.map((i) => frames[i]).filter(Boolean)
    : frames;
  const activeFps = group?.fps ?? fps;

  const { isPlaying, togglePlay, currentFrame, totalFrames } = useAnimation(
    canvasRef,
    activeFrames,
    activeFps
  );

  const hasFrames = activeFrames.length > 0;
  const canvasWidth = activeFrames[0]?.width ?? 0;
  const canvasHeight = activeFrames[0]?.height ?? 0;

  // Scale canvas display
  const maxDisplayWidth = 500;
  const maxDisplayHeight = 400;
  const scale = Math.min(
    1,
    maxDisplayWidth / (canvasWidth || 1),
    maxDisplayHeight / (canvasHeight || 1)
  );

  // Set canvas dimensions when frames change
  useEffect(() => {
    if (hasFrames && canvasRef.current) {
      canvasRef.current.width = canvasWidth;
      canvasRef.current.height = canvasHeight;
    }
  }, [hasFrames, canvasWidth, canvasHeight]);

  return (
    <div className="animation-preview">
      <h3 className="animation-preview__title">
        动画预览
        {hasFrames && (
          <span className="animation-preview__counter">
            第 {currentFrame + 1} 帧 / 共 {totalFrames} 帧
            {group && <span className="animation-preview__group-badge">[{group.name}]</span>}
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
              {groups.length > 0
                ? '请选择一个动画分组来预览'
                : '请上传精灵图并点击"开始切割"'}
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
