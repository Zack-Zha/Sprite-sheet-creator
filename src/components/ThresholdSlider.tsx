import './ThresholdSlider.css';

interface ThresholdSliderProps {
  value: number;
  onChange: (value: number) => void;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  hasFrames: boolean;
}

export function ThresholdSlider({
  value,
  onChange,
  enabled,
  onToggle,
  hasFrames,
}: ThresholdSliderProps) {
  return (
    <div className={`threshold-slider ${!hasFrames ? 'threshold-slider--disabled' : ''}`}>
      <div className="threshold-slider__header">
        <label className="threshold-slider__toggle">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            disabled={!hasFrames}
          />
          <span>去除背景</span>
        </label>
      </div>

      <div className="threshold-slider__controls">
        <input
          type="range"
          className="threshold-slider__range"
          min="0"
          max="100"
          step="1"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={!enabled || !hasFrames}
        />
        <input
          type="number"
          className="threshold-slider__number"
          min="0"
          max="100"
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!isNaN(v) && v >= 0 && v <= 100) onChange(v);
          }}
          disabled={!enabled || !hasFrames}
        />
        <span className="threshold-slider__unit">%</span>
      </div>

      {!hasFrames && (
        <p className="threshold-slider__hint">请先切割帧，再使用去背景功能</p>
      )}
    </div>
  );
}
