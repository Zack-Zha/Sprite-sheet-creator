import { useRef, useEffect, useCallback } from 'react';
import type { GridMap, CellState } from '../types';
import './GridOverlay.css';

interface GridOverlayProps {
  scaledImage: HTMLCanvasElement | null;
  rows: number;
  cols: number;
  frameWidth: number;
  frameHeight: number;
  gridMap: GridMap;
  activeState: CellState;
  onToggleCell: (row: number, col: number, state: CellState) => void;
}

const STATE_COLORS: Record<CellState, string> = {
  idle: 'rgba(63, 185, 80, 0.45)',
  walk: 'rgba(31, 111, 235, 0.45)',
  attack: 'rgba(233, 69, 96, 0.45)',
};

const STATE_BORDERS: Record<CellState, string> = {
  idle: '#3fb950',
  walk: '#1f6feb',
  attack: '#e94560',
};

export function GridOverlay({
  scaledImage,
  rows,
  cols,
  frameWidth,
  frameHeight,
  gridMap,
  activeState,
  onToggleCell,
}: GridOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalWidth = cols * frameWidth;
  const totalHeight = rows * frameHeight;

  // Draw the scaled image + grid overlay
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

    // Draw cell state highlights
    for (const [key, state] of Object.entries(gridMap)) {
      if (!state) continue;
      const [r, c] = key.split('_').map(Number);
      const x = c * frameWidth;
      const y = r * frameHeight;

      // Fill with state color
      ctx.fillStyle = STATE_COLORS[state] || 'rgba(255,255,255,0.2)';
      ctx.fillRect(x, y, frameWidth, frameHeight);

      // Border with state color
      ctx.strokeStyle = STATE_BORDERS[state] || '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, frameWidth - 2, frameHeight - 2);
    }

    // Hovered cell indicator — draw row/col label in small text
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '10px monospace';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const key = `${r}_${c}`;
        if (!gridMap[key]) {
          // Show faint index number on unmarked cells
          ctx.fillStyle = 'rgba(255,255,255,0.15)';
          ctx.fillText(`${r},${c}`, c * frameWidth + 3, r * frameHeight + 12);
        }
      }
    }
  }, [scaledImage, rows, cols, frameWidth, frameHeight, gridMap, totalWidth, totalHeight]);

  useEffect(() => {
    draw();
  }, [draw]);

  // Handle click on grid cells
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      const col = Math.floor(x / frameWidth);
      const row = Math.floor(y / frameHeight);

      if (row >= 0 && row < rows && col >= 0 && col < cols) {
        onToggleCell(row, col, activeState);
      }
    },
    [rows, cols, frameWidth, frameHeight, activeState, onToggleCell]
  );

  const hasContent = scaledImage && rows > 0 && cols > 0;

  // Display scale for the canvas — fit within container
  const maxDisplayWidth = 600;
  const displayScale = Math.min(1, maxDisplayWidth / (totalWidth || 1));
  const displayWidth = Math.round(totalWidth * displayScale);
  const displayHeight = Math.round(totalHeight * displayScale);

  return (
    <div className="grid-overlay" ref={containerRef}>
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
              width: displayWidth,
              height: displayHeight,
              imageRendering: 'pixelated',
              cursor: 'crosshair',
            }}
            onClick={handleCanvasClick}
          />
        ) : (
          <div className="grid-overlay__empty">
            <p>请先上传图片并点击"开始切割"</p>
          </div>
        )}
      </div>

      {hasContent && (
        <p className="grid-overlay__hint">
          点击格子标记为 <strong>{activeState === 'idle' ? '待机' : activeState === 'walk' ? '行走' : '攻击'}</strong>，再次点击取消标记
        </p>
      )}
    </div>
  );
}
