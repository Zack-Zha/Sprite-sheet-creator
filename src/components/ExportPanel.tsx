import { useState } from 'react';
import type { SpriteSheetParams, AnimationTrack } from '../types';
import { exportPng, exportGif, downloadBlob } from '../utils/export';
import './ExportPanel.css';

interface ExportPanelProps {
  frames: HTMLCanvasElement[];
  params: SpriteSheetParams;
  tracks: Record<string, AnimationTrack>;
  activeTrackId: string;
}

export function ExportPanel({ frames, params, tracks, activeTrackId }: ExportPanelProps) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [gifProgress, setGifProgress] = useState(0);
  const hasFrames = frames.length > 0;

  const activeTrack = tracks[activeTrackId];
  const nonEmptyTracks = Object.values(tracks).filter((t) => t.frameIndices.length > 0);

  const handleExportPng = async () => {
    if (!hasFrames) return;
    setExporting('png');
    try {
      const blob = await exportPng(frames, params.cols, params.frameWidth, params.frameHeight);
      downloadBlob(blob, `sprite-sheet-${params.cols}x${params.rows}.png`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('PNG 导出失败：', err);
      alert(`PNG 导出失败：${message}`);
    } finally {
      setExporting(null);
    }
  };

  const handleExportTrackGif = async (track: AnimationTrack) => {
    const trackFrames = track.frameIndices
      .map((i) => frames[i])
      .filter(Boolean) as HTMLCanvasElement[];
    if (trackFrames.length === 0) return;

    setExporting(track.id);
    setGifProgress(0);
    try {
      const blob = await exportGif(trackFrames, track.fps, (p) => {
        setGifProgress(Math.round(p * 100));
      });
      downloadBlob(blob, `animation-${track.id}.gif`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('GIF 导出失败：', err);
      alert(`GIF 导出失败：${message}`);
    } finally {
      setExporting(null);
      setGifProgress(0);
    }
  };

  const handleExportAllGifs = async () => {
    for (const track of nonEmptyTracks) {
      await handleExportTrackGif(track);
    }
  };

  const isExporting = exporting !== null;

  return (
    <div className="export-panel">
      <h3 className="export-panel__title">导出</h3>

      <div className="export-panel__buttons">
        <button
          className="export-panel__btn export-panel__btn--png"
          onClick={handleExportPng}
          disabled={!hasFrames || isExporting}
        >
          {exporting === 'png' ? '⏳ 正在导出...' : '📦 导出 PNG 精灵图'}
        </button>
      </div>

      {isExporting && gifProgress > 0 && (
        <div className="export-panel__progress">
          <div className="export-panel__progress-bar" style={{ width: `${gifProgress}%` }} />
        </div>
      )}

      {/* Current track GIF */}
      {activeTrack && activeTrack.frameIndices.length > 0 && (
        <div className="export-panel__section">
          <button
            className="export-panel__btn export-panel__btn--gif export-panel__btn--full"
            onClick={() => handleExportTrackGif(activeTrack)}
            disabled={isExporting}
          >
            {exporting === activeTrack.id
              ? `⏳ 编码中... ${gifProgress}%`
              : `🎞 导出当前动画 GIF (${activeTrack.name} ${activeTrack.frameIndices.length}帧)`}
          </button>
        </div>
      )}

      {/* All tracks GIF */}
      {nonEmptyTracks.length > 0 && (
        <div className="export-panel__section">
          <button
            className="export-panel__btn export-panel__btn--accent export-panel__btn--full"
            onClick={handleExportAllGifs}
            disabled={isExporting}
          >
            🎬 导出全部动画 GIF ({nonEmptyTracks.length}个)
          </button>
        </div>
      )}

      {!hasFrames && (
        <p className="export-panel__hint">请先切割帧，再导出</p>
      )}
    </div>
  );
}
