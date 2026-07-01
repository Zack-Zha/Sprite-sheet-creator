import { useState } from 'react';
import type { SpriteSheetParams, AnimationGroup } from '../types';
import { exportPng, exportGif, downloadBlob } from '../utils/export';
import './ExportPanel.css';

interface ExportPanelProps {
  frames: HTMLCanvasElement[];
  params: SpriteSheetParams;
  groups?: AnimationGroup[];
}

export function ExportPanel({ frames, params, groups = [] }: ExportPanelProps) {
  const [exporting, setExporting] = useState<string | null>(null); // 'png' | 'gif-all' | group name
  const [gifProgress, setGifProgress] = useState(0);

  const hasFrames = frames.length > 0;

  const handleExportPng = async () => {
    if (!hasFrames) return;
    setExporting('png');
    try {
      const blob = await exportPng(frames, params.cols, params.frameWidth, params.frameHeight);
      downloadBlob(blob, `sprite-sheet-${params.cols}x${params.rows}.png`);
    } catch (err) {
      console.error('PNG 导出失败：', err);
      alert('PNG 导出失败，请重试。');
    } finally {
      setExporting(null);
    }
  };

  const handleExportAllGif = async () => {
    if (!hasFrames) return;
    setExporting('gif-all');
    setGifProgress(0);
    try {
      const blob = await exportGif(frames, params.fps, (progress) => {
        setGifProgress(Math.round(progress * 100));
      });
      downloadBlob(blob, 'animation-all.gif');
    } catch (err) {
      console.error('GIF 导出失败：', err);
      alert('GIF 导出失败，请重试。');
    } finally {
      setExporting(null);
      setGifProgress(0);
    }
  };

  const handleExportGroupGif = async (group: AnimationGroup) => {
    const groupFrames = group.frameIndices.map((i) => frames[i]).filter(Boolean);
    if (groupFrames.length === 0) return;

    setExporting(group.name);
    setGifProgress(0);
    try {
      const blob = await exportGif(groupFrames, group.fps, (progress) => {
        setGifProgress(Math.round(progress * 100));
      });
      downloadBlob(blob, `animation-${group.name}.gif`);
    } catch (err) {
      console.error('GIF 导出失败：', err);
      alert('GIF 导出失败，请重试。');
    } finally {
      setExporting(null);
      setGifProgress(0);
    }
  };

  const isExporting = exporting !== null;

  return (
    <div className="export-panel">
      <h3 className="export-panel__title">导出</h3>

      {/* Base export buttons */}
      <div className="export-panel__buttons">
        <button
          className="export-panel__btn export-panel__btn--png"
          onClick={handleExportPng}
          disabled={!hasFrames || isExporting}
        >
          {exporting === 'png' ? '⏳ 正在导出...' : '📦 导出 PNG'}
        </button>

        <button
          className="export-panel__btn export-panel__btn--gif"
          onClick={handleExportAllGif}
          disabled={!hasFrames || isExporting}
        >
          {exporting === 'gif-all' ? `⏳ 编码中... ${gifProgress}%` : '🎞 导出全部 GIF'}
        </button>
      </div>

      {isExporting && gifProgress > 0 && (
        <div className="export-panel__progress">
          <div
            className="export-panel__progress-bar"
            style={{ width: `${gifProgress}%` }}
          />
        </div>
      )}

      {/* Per-group export */}
      {groups.length > 0 && (
        <div className="export-panel__groups">
          <h4 className="export-panel__groups-title">按分组导出 GIF</h4>
          {groups.map((group) => (
            <button
              key={group.name}
              className="export-panel__btn export-panel__btn--group"
              onClick={() => handleExportGroupGif(group)}
              disabled={isExporting}
            >
              {exporting === group.name
                ? `⏳ ${group.name} ${gifProgress}%`
                : `🎞 导出 ${group.name} (${group.frameIndices.length}帧)`}
            </button>
          ))}
        </div>
      )}

      {!hasFrames && (
        <p className="export-panel__hint">请先切割帧，再导出</p>
      )}
    </div>
  );
}
