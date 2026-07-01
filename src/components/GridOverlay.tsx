import { useRef, useEffect, useCallback } from 'react';
import type { CellState, AnimationTrack } from '../types';
import './GridOverlay.css';

interface GridOverlayProps {
  scaledImage: HTMLCanvasElement | null;
  rows: number;
  cols: number;
  frameWidth: number;
  frameHeight: number;
  gridMap: Record<string, CellState | undefined>;
  tracks: Record<string, AnimationTrack>;
  activeTrackId: CellState;
  onToggleCell: (row: number, col: number) => void;
  /** Magic wand background picking mode */
  isPickingBackground?: boolean;
  onPickBackground?: (x: number, y: number) => void;
}

const STATE_COLORS: Record<string, string> = {
  idle: 'rgba(63, 185, 80, 0.45)',
  walk: 'rgba(31, 111, 235, 0.45)',
  attack: 'rgba(233, 69, 96, 0.45)',
};

const STATE_BORDERS: Record<string, string> = {
  idle: '#3fb950',
  walk: '#1f6feb',
  attack: '#e94560',
};

export function GridOverlay({
  scaledImage, rows, cols, frameWidth, frameHeight,
  gridMap, tracks, activeTrackId, onToggleCell,
  isPickingBackground, onPickBackground,
}: GridOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const totalWidth = cols * frameWidth;
  const totalHeight = rows * frameHeight;

  // Build a map: frameIndex → its order in the active track (1-indexed)
  const activeOrderMap = new Map<number, number>();
  const activeTrack = tracks[activeTrackId];
  if (activeTrack) {
    activeTrack.frameIndices.forEach((idx, order) => {
      activeOrderMap.set(idx, order + 1);
    });
  }

  // Build set of frameIndices that belong to OTHER tracks
  const otherTrackIndices = new Set<number>();
  for (const [id, track] of Object.entries(tracks)) {
    if (id !== activeTrackId) {
      for (const idx of track.frameIndices) {
        otherTrackIndices.add(idx);
      }
    }
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = totalWidth;
    canvas.height = totalHeight;
    ctx.imageSmoothingEnabled = false;

    // Draw scaled image
    if (scaledImage) {
      ctx.clearRect(0, 0, totalWidth, totalHeight);
      ctx.drawImage(scaledImage, 0, 0);
    }

    // Draw grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    for (let r = 0; r <= rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * frameHeight);
      ctx.lineTo(totalWidth, r * frameHeight);
      ctx.stroke();
    }
    for (let c = 0; c <= cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * frameWidth, 0);
      ctx.lineTo(c * frameWidth, totalHeight);
      ctx.stroke();
    }

    // Draw cell highlights from gridMap
    for (const [key, state] of Object.entries(gridMap)) {
      if (!state) continue;
      const [r, c] = key.split('_').map(Number);
      const x = c * frameWidth;
      const y = r * frameHeight;
      const frameIndex = r * cols + c;

      const isActive = state === activeTrackId;
      const color = STATE_COLORS[state] || 'rgba(255,255,255,0.2)';
      const border = STATE_BORDERS[state] || '#fff';

      // Fill
      ctx.fillStyle = isActive ? color : 'rgba(128,128,128,0.2)';
      ctx.fillRect(x, y, frameWidth, frameHeight);

      // Border — thicker for active track
      ctx.strokeStyle = border;
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.strokeRect(x + 1, y + 1, frameWidth - 2, frameHeight - 2);

      // Play-order number on active track cells
      if (isActive && activeOrderMap.has(frameIndex)) {
        const order = activeOrderMap.get(frameIndex)!;
        // Draw a small badge
        const badgeSize = 14;
        ctx.fillStyle = border;
        ctx.fillRect(x + frameWidth - badgeSize - 2, y + 2, badgeSize, badgeSize);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(
          String(order),
          x + frameWidth - badgeSize / 2 - 2,
          y + 2 + badgeSize / 2
        );
      }
    }
  }, [scaledImage, rows, cols, frameWidth, frameHeight, gridMap, activeTrackId, activeOrderMap, totalWidth, totalHeight]);

  useEffect(() => { draw(); }, [draw]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      // Pixel coords on the scaled image
      const px = Math.floor((e.clientX - rect.left) * scaleX);
      const py = Math.floor((e.clientY - rect.top) * scaleY);

      // Magic wand picking mode — don't toggle cells
      if (isPickingBackground && onPickBackground) {
        onPickBackground(px, py);
        return;
      }

      const col = Math.floor(px / frameWidth);
      const row = Math.floor(py / frameHeight);
      if (row >= 0 && row < rows && col >= 0 && col < cols) {
        onToggleCell(row, col);
      }
    },
    [rows, cols, frameWidth, frameHeight, onToggleCell, isPickingBackground, onPickBackground]
  );

  const hasContent = scaledImage && rows > 0 && cols > 0;
  const maxDisplayWidth = 600;
  const displayScale = Math.min(1, maxDisplayWidth / (totalWidth || 1));
  const displayWidth = Math.round(totalWidth * displayScale);
  const displayHeight = Math.round(totalHeight * displayScale);

  const activeLabel = activeTrackId === 'idle' ? '待机' : activeTrackId === 'walk' ? '行走' : '攻击';

  return (
    <div className="grid-overlay">
      <div className="grid-overlay__header">
        <h3 className="grid-overlay__title">网格编辑</h3>
        <div className="grid-overlay__legend">
          <span className="grid-overlay__legend-item" style={{ color: STATE_BORDERS.idle }}>■ 待机</span>
          <span className="grid-overlay__legend-item" style={{ color: STATE_BORDERS.walk }}>■ 行走</span>
          <span className="grid-overlay__legend-item" style={{ color: STATE_BORDERS.attack }}>■ 攻击</span>
        </div>
      </div>

      <div className="grid-overlay__canvas-wrapper">
        {hasContent ? (
          <canvas
            ref={canvasRef}
            className="grid-overlay__canvas"
            style={{
              width: displayWidth, height: displayHeight,
              imageRendering: 'pixelated',
              cursor: isPickingBackground ? 'crosshair' : 'crosshair',
            }}
            onClick={handleCanvasClick}
          />
        ) : (
          <div className="grid-overlay__empty">
            <p>请先上传图片并点击"开始切割"</p>
          </div>
        )}
      </div>

      {hasContent && !isPickingBackground && (
        <p className="grid-overlay__hint">
          当前编辑：<strong>{activeLabel}</strong> — 点击格子添加/移除帧，右上角数字为播放顺序
        </p>
      )}
      {hasContent && isPickingBackground && (
        <p className="grid-overlay__hint grid-overlay__hint--picking">
          🖱 请点击图片中的背景区域进行取样
        </p>
      )}
    </div>
  );
}
