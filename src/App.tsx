import { useSpriteProcessor } from './hooks/useSpriteProcessor';
import { DropZone } from './components/DropZone';
import { ParamForm } from './components/ParamForm';
import { BackgroundRemovalPanel } from './components/BackgroundRemovalPanel';
import { GridOverlay } from './components/GridOverlay';
import { TracksPanel } from './components/TracksPanel';
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
    bgOptions,
    bgEnabled,
    isProcessing,
    hasImage,
    hasFrames,
    tracks,
    activeTrackId,
    gridMap,
    isPickingBackground,
    setParams,
    handleFile,
    processFrames,
    setBgOptions,
    setBgEnabled,
    setMagicWandSeed,
    clearMagicWandSeed,
    startPickingBackground,
    toggleCellState,
    setActiveTrackId,
    updateTrackFps,
    clearTrack,
    sortTrackByGrid,
  } = useSpriteProcessor();

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">🎮 精灵图处理工具</h1>
        <p className="app__subtitle">
          上传、缩放、切割、去背景、网格编辑、动画预览、导出
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

          <BackgroundRemovalPanel
            options={bgOptions}
            enabled={bgEnabled}
            isPicking={isPickingBackground}
            onChange={setBgOptions}
            onToggle={setBgEnabled}
            onStartPick={startPickingBackground}
            onClearSeed={clearMagicWandSeed}
            hasFrames={hasFrames}
          />

          {/* Track selector */}
          {hasFrames && (
            <div className="app__edit-mode">
              <h3 className="app__edit-mode-title">编辑轨道</h3>
              <div className="app__edit-mode-buttons">
                {(['idle', 'walk', 'attack'] as const).map((id) => {
                  const label = id === 'idle' ? '待机' : id === 'walk' ? '行走' : '攻击';
                  return (
                    <button
                      key={id}
                      className={`app__edit-mode-btn app__edit-mode-btn--${id} ${activeTrackId === id ? 'app__edit-mode-btn--active' : ''}`}
                      onClick={() => setActiveTrackId(id)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <TracksPanel
            tracks={tracks}
            activeTrackId={activeTrackId}
            onSelectTrack={setActiveTrackId}
            onUpdateFps={updateTrackFps}
            onClearTrack={clearTrack}
            onSortTrack={sortTrackByGrid}
            hasFrames={hasFrames}
          />

          <ExportPanel
            frames={processedFrames}
            params={params}
            tracks={tracks}
            activeTrackId={activeTrackId}
          />
        </aside>

        <main className="app__right">
          {hasFrames && scaledImage && (
            <GridOverlay
              scaledImage={scaledImage}
              rows={params.rows}
              cols={params.cols}
              frameWidth={params.frameWidth}
              frameHeight={params.frameHeight}
              gridMap={gridMap}
              tracks={tracks}
              activeTrackId={activeTrackId}
              onToggleCell={toggleCellState}
              isPickingBackground={isPickingBackground}
              onPickBackground={setMagicWandSeed}
            />
          )}

          <AnimationPreview
            frames={processedFrames}
            tracks={tracks}
            activeTrackId={activeTrackId}
          />
        </main>
      </div>
    </div>
  );
}

export default App;
