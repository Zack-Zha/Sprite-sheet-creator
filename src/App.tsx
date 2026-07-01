import { useState } from 'react';
import type { CellState } from './types';
import { useSpriteProcessor } from './hooks/useSpriteProcessor';
import { DropZone } from './components/DropZone';
import { ParamForm } from './components/ParamForm';
import { ThresholdSlider } from './components/ThresholdSlider';
import { GridOverlay } from './components/GridOverlay';
import { AnimationGroupManager } from './components/AnimationGroupManager';
import { AnimationPreview } from './components/AnimationPreview';
import { ExportPanel } from './components/ExportPanel';
import './App.css';

function App() {
  const {
    originalImage,
    scaledImage,
    processedFrames,
    imageWidth,
    imageHeight,
    scaledWidth,
    scaledHeight,
    params,
    detectedScaleFactor,
    bgThreshold,
    bgEnabled,
    isProcessing,
    hasImage,
    hasFrames,
    gridMap,
    groups,
    activeGroup,
    setParams,
    handleFile,
    processFrames,
    setBgThreshold,
    setBgEnabled,
    toggleCellState,
    createGroup,
    deleteGroup,
    setActiveGroup,
  } = useSpriteProcessor();

  const [activeEditState, setActiveEditState] = useState<CellState>('idle');

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">🎮 精灵图处理工具</h1>
        <p className="app__subtitle">
          上传、缩放、切割、去背景、网格编辑、分组动画、导出
        </p>
      </header>

      <div className="app__body">
        <aside className="app__left">
          <DropZone
            onFileLoad={handleFile}
            hasImage={hasImage}
            imageName={originalImage ? '精灵图已加载' : undefined}
          />

          <ParamForm
            params={params}
            detectedScaleFactor={detectedScaleFactor}
            onParamsChange={setParams}
            onProcess={processFrames}
            disabled={!hasImage}
            isProcessing={isProcessing}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            scaledWidth={scaledWidth}
            scaledHeight={scaledHeight}
          />

          <ThresholdSlider
            value={bgThreshold}
            onChange={setBgThreshold}
            enabled={bgEnabled}
            onToggle={setBgEnabled}
            hasFrames={hasFrames}
          />

          {/* Grid editing state selector */}
          {hasFrames && (
            <div className="app__edit-mode">
              <h3 className="app__edit-mode-title">编辑模式</h3>
              <div className="app__edit-mode-buttons">
                {([
                  ['idle', '待机'],
                  ['walk', '行走'],
                  ['attack', '攻击'],
                ] as [CellState, string][]).map(([state, label]) => (
                  <button
                    key={state}
                    className={`app__edit-mode-btn app__edit-mode-btn--${state} ${activeEditState === state ? 'app__edit-mode-btn--active' : ''}`}
                    onClick={() => setActiveEditState(state)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimationGroupManager
            groups={groups}
            activeGroup={activeGroup}
            onCreateGroup={createGroup}
            onDeleteGroup={deleteGroup}
            onSelectGroup={setActiveGroup}
            hasGrid={hasFrames}
          />

          <ExportPanel
            frames={processedFrames}
            params={params}
            groups={groups}
          />
        </aside>

        <main className="app__right">
          {/* Grid overlay for editing */}
          {hasFrames && scaledImage && (
            <GridOverlay
              scaledImage={scaledImage}
              rows={params.rows}
              cols={params.cols}
              frameWidth={params.frameWidth}
              frameHeight={params.frameHeight}
              gridMap={gridMap}
              activeState={activeEditState}
              onToggleCell={toggleCellState}
            />
          )}

          <AnimationPreview
            frames={processedFrames}
            fps={params.fps}
            groups={groups}
            activeGroup={activeGroup}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
