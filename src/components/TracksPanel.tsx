import type { CellState, AnimationTrack } from '../types';
import './TracksPanel.css';

interface TracksPanelProps {
  tracks: Record<string, AnimationTrack>;
  activeTrackId: CellState;
  onSelectTrack: (id: CellState) => void;
  onUpdateFps: (trackId: string, fps: number) => void;
  onClearTrack: (trackId: string) => void;
  onSortTrack: (trackId: string) => void;
  hasFrames: boolean;
}

const TRACK_ORDER: CellState[] = ['idle', 'walk', 'attack'];

export function TracksPanel({
  tracks, activeTrackId, onSelectTrack,
  onUpdateFps, onClearTrack, onSortTrack, hasFrames,
}: TracksPanelProps) {
  return (
    <div className="tracks-panel">
      <h3 className="tracks-panel__title">动画轨道</h3>
      <div className="tracks-panel__list">
        {TRACK_ORDER.map((id) => {
          const track = tracks[id];
          if (!track) return null;
          const isActive = id === activeTrackId;
          const frameCount = track.frameIndices.length;

          return (
            <div
              key={id}
              className={`tracks-panel__item ${isActive ? 'tracks-panel__item--active' : ''}`}
              onClick={() => onSelectTrack(id)}
            >
              <div className="tracks-panel__item-header">
                <span className={`tracks-panel__item-state tracks-panel__item-state--${id}`}>
                  {track.name}
                </span>
                <span className="tracks-panel__item-count">
                  {frameCount} 帧
                </span>
              </div>

              <div className="tracks-panel__item-controls" onClick={(e) => e.stopPropagation()}>
                <label className="tracks-panel__fps-label">FPS</label>
                <input
                  className="tracks-panel__fps-input"
                  type="number"
                  min="1"
                  max="60"
                  value={track.fps}
                  onChange={(e) => onUpdateFps(id, Number(e.target.value))}
                  disabled={!hasFrames}
                />
                <button
                  className="tracks-panel__btn"
                  onClick={() => onSortTrack(id)}
                  disabled={!hasFrames || frameCount === 0}
                  title="按网格顺序排序"
                >
                  ↕ 排序
                </button>
                <button
                  className="tracks-panel__btn tracks-panel__btn--clear"
                  onClick={() => onClearTrack(id)}
                  disabled={!hasFrames || frameCount === 0}
                  title="清空此轨道"
                >
                  ✕ 清空
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
