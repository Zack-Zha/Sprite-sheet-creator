import type { SpriteSheetParams } from '../types';
import './ParamForm.css';

interface ParamFormProps {
  params: SpriteSheetParams;
  detectedScaleFactor: number;
  onParamsChange: (params: SpriteSheetParams) => void;
  onProcess: () => void;
  disabled: boolean;
  isProcessing: boolean;
  imageWidth: number;
  imageHeight: number;
  scaledWidth: number;
  scaledHeight: number;
}

export function ParamForm({
  params,
  detectedScaleFactor,
  onParamsChange,
  onProcess,
  disabled,
  isProcessing,
  imageWidth,
  imageHeight,
  scaledWidth,
  scaledHeight,
}: ParamFormProps) {
  const handleChange = (field: keyof SpriteSheetParams, value: string | number) => {
    if (field === 'scaleFactor' && value === 'auto') {
      onParamsChange({ ...params, scaleFactor: 'auto' });
      return;
    }
    const num = typeof value === 'number' ? value : parseInt(value, 10);
    if (isNaN(num) || num < 1) return;
    onParamsChange({ ...params, [field]: num });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !disabled && !isProcessing) {
      onProcess();
    }
  };

  const scaleFactorValue = params.scaleFactor === 'auto' ? 'auto' : params.scaleFactor;

  return (
    <div className="param-form">
      <h3 className="param-form__title">切割参数</h3>

      <div className="param-form__grid">
        <label className="param-form__label" htmlFor="param-scale">
          缩放倍率
        </label>
        <select
          id="param-scale"
          className="param-form__input param-form__select"
          value={scaleFactorValue}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'auto') {
              onParamsChange({ ...params, scaleFactor: 'auto' });
            } else {
              onParamsChange({ ...params, scaleFactor: Number(val) });
            }
          }}
          onKeyDown={handleKeyDown}
        >
          <option value="auto">自动</option>
          <option value="1">1x</option>
          <option value="2">2x</option>
          <option value="3">3x</option>
          <option value="4">4x</option>
          <option value="8">8x</option>
        </select>

        <label className="param-form__label" htmlFor="param-fw">
          帧宽度 (px)
        </label>
        <input
          id="param-fw"
          className="param-form__input"
          type="number"
          min="1"
          max="4096"
          value={params.frameWidth}
          onChange={(e) => handleChange('frameWidth', e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <label className="param-form__label" htmlFor="param-fh">
          帧高度 (px)
        </label>
        <input
          id="param-fh"
          className="param-form__input"
          type="number"
          min="1"
          max="4096"
          value={params.frameHeight}
          onChange={(e) => handleChange('frameHeight', e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <label className="param-form__label" htmlFor="param-fps">
          默认帧率 (FPS)
        </label>
        <input
          id="param-fps"
          className="param-form__input"
          type="number"
          min="1"
          max="60"
          value={params.fps}
          onChange={(e) => handleChange('fps', e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>

      {/* Read-only display of detected/calculated values */}
      {detectedScaleFactor > 0 && (
        <div className="param-form__info-grid">
          <span className="param-form__info-label">检测倍率：</span>
          <span className="param-form__info-value">{detectedScaleFactor}x</span>

          <span className="param-form__info-label">原始尺寸：</span>
          <span className="param-form__info-value">{imageWidth}×{imageHeight}px</span>

          {scaledWidth > 0 && (
            <>
              <span className="param-form__info-label">缩放后：</span>
              <span className="param-form__info-value">{scaledWidth}×{scaledHeight}px</span>
            </>
          )}

          <span className="param-form__info-label">自动网格：</span>
          <span className="param-form__info-value">{params.rows}行 × {params.cols}列</span>

          <span className="param-form__info-label">总帧数：</span>
          <span className="param-form__info-value">{params.rows * params.cols} 帧</span>
        </div>
      )}

      {!detectedScaleFactor && imageWidth > 0 && (
        <p className="param-form__info">原始图片：{imageWidth}×{imageHeight}px</p>
      )}

      <button
        className="param-form__button"
        onClick={onProcess}
        disabled={disabled || isProcessing}
      >
        {isProcessing ? (
          <>
            <span className="param-form__spinner" />
            正在处理...
          </>
        ) : (
          '🔪 开始切割'
        )}
      </button>
    </div>
  );
}
