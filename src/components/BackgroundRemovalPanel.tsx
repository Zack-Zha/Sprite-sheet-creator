import type { BackgroundRemovalOptions, BackgroundRemovalMode } from '../types';
import './BackgroundRemovalPanel.css';

interface BackgroundRemovalPanelProps {
  options: BackgroundRemovalOptions;
  enabled: boolean;
  isPicking: boolean;
  onChange: (options: BackgroundRemovalOptions) => void;
  onToggle: (enabled: boolean) => void;
  onStartPick: () => void;
  onClearSeed: () => void;
  hasFrames: boolean;
}

const MODES: { value: BackgroundRemovalMode; label: string; desc: string }[] = [
  { value: 'edge-connected', label: '边缘连通', desc: '推荐：从边缘扩散，保留角色内部白色区域' },
  { value: 'magic-wand', label: '魔棒点击', desc: '点击背景取样颜色后抠图' },
  { value: 'corner-threshold', label: '颜色阈值', desc: '旧版：整图颜色匹配删除，可能误删内部白色' },
];

export function BackgroundRemovalPanel({
  options, enabled, isPicking,
  onChange, onToggle, onStartPick, onClearSeed,
  hasFrames,
}: BackgroundRemovalPanelProps) {
  const update = (patch: Partial<BackgroundRemovalOptions>) => {
    onChange({ ...options, ...patch });
  };

  return (
    <div className={`bg-panel ${!hasFrames ? 'bg-panel--disabled' : ''}`}>
      <div className="bg-panel__header">
        <label className="bg-panel__toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            disabled={!hasFrames}
          />
          <span>去除背景</span>
        </label>
      </div>

      {/* Mode selection */}
      <div className="bg-panel__modes">
        {MODES.map((m) => (
          <button
            key={m.value}
            className={`bg-panel__mode-btn ${options.mode === m.value ? 'bg-panel__mode-btn--active' : ''}`}
            onClick={() => update({ mode: m.value })}
            disabled={!enabled || !hasFrames}
            title={m.desc}
          >
            {m.label}
          </button>
        ))}
      </div>
      {options.mode !== 'corner-threshold' && (
        <p className="bg-panel__mode-desc">
          {options.mode === 'edge-connected'
            ? '从图片边缘向内部扩散，只删除与背景连通的像素。角色内部白色区域（眼睛、高光）不受影响。'
            : '点击背景区域取样颜色，然后边缘连通抠图。'}
        </p>
      )}
      {options.mode === 'corner-threshold' && (
        <p className="bg-panel__mode-desc bg-panel__mode-desc--warn">
          旧版模式：对所有像素做颜色匹配删除。可能误删角色内部的白色区域。
        </p>
      )}

      {/* Threshold slider */}
      <div className="bg-panel__control">
        <label className="bg-panel__label">容差</label>
        <div className="bg-panel__threshold-row">
          <input
            type="range"
            className="bg-panel__range"
            min="0" max="60" step="1"
            value={options.threshold}
            onChange={(e) => update({ threshold: Number(e.target.value) })}
            disabled={!enabled || !hasFrames}
          />
          <input
            type="number"
            className="bg-panel__number"
            min="0" max="100"
            value={options.threshold}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!isNaN(v) && v >= 0 && v <= 100) update({ threshold: v });
            }}
            disabled={!enabled || !hasFrames}
          />
          <span className="bg-panel__unit">%</span>
        </div>
      </div>

      {/* Pixel art options */}
      <div className="bg-panel__options">
        <label className="bg-panel__checkbox">
          <input
            type="checkbox"
            checked={options.hardAlpha}
            onChange={(e) => update({ hardAlpha: e.target.checked })}
            disabled={!enabled || !hasFrames}
          />
          <span>硬边缘</span>
        </label>

        <label className="bg-panel__checkbox">
          <input
            type="checkbox"
            checked={options.edgeCleanup}
            onChange={(e) => update({ edgeCleanup: e.target.checked })}
            disabled={!enabled || !hasFrames}
          />
          <span>边缘清理</span>
        </label>

        <label className="bg-panel__checkbox" title="像素风素材通常不建议开启羽化">
          <input
            type="checkbox"
            checked={options.feather}
            onChange={(e) => update({ feather: e.target.checked })}
            disabled={!enabled || !hasFrames}
          />
          <span>羽化</span>
        </label>
      </div>
      {options.feather && (
        <p className="bg-panel__feather-warn">⚠ 羽化会产生半透明边缘，像素风素材不建议开启</p>
      )}

      {/* Magic wand seed */}
      {options.mode === 'magic-wand' && (
        <div className="bg-panel__seed">
          <button
            className="bg-panel__seed-btn"
            onClick={onStartPick}
            disabled={!enabled || !hasFrames || isPicking}
          >
            {isPicking ? '🖱 请在图上点击背景...' : '🖱 点击背景取样'}
          </button>
          {options.seedColor && (
            <div className="bg-panel__seed-info">
              <span className="bg-panel__seed-swatch"
                style={{ background: `rgb(${options.seedColor.r},${options.seedColor.g},${options.seedColor.b})` }}
              />
              <span className="bg-panel__seed-text">
                RGB({options.seedColor.r},{options.seedColor.g},{options.seedColor.b})
              </span>
              <button className="bg-panel__seed-clear" onClick={onClearSeed}>✕</button>
            </div>
          )}
          {isPicking && (
            <button className="bg-panel__seed-cancel" onClick={() => onChange({ ...options, mode: 'edge-connected' })}>
              取消取样
            </button>
          )}
        </div>
      )}

      {!hasFrames && (
        <p className="bg-panel__hint">请先切割帧，再使用去背景功能</p>
      )}
    </div>
  );
}
