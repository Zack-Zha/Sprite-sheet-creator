# 🎮 Sprite Sheet Creator

精灵图处理工具 — 上传、缩放、切割、去背景、网格编辑、分组动画、导出。

[在线体验](https://zack-zha.github.io/Sprite-sheet-creator/)

## 功能

- 📤 **拖拽上传** — 支持 PNG / JPEG / GIF / WebP
- 🔍 **自动倍率检测** — 自动识别 2x/3x/4x/8x 像素精灵图并做最近邻缩小（无损像素风格）
- ✂️ **精灵图切割** — 自动网格计算 + 像素精确切片
- 🎨 **智能去背景** — 四角采样 + 阈值滑块 + 边缘羽化
- 🏗️ **网格可视化编辑** — 点击格子标记动画状态（待机/行走/攻击）
- 🎬 **分组动画预览** — 每个分组独立 FPS 播放
- 📦 **导出** — 透明 PNG 精灵图 / 全部 GIF / 按分组导出独立 GIF

## 快速开始

### 一键启动（Windows）

双击 `start.bat`

### 手动启动

```bash
npm install
npm run dev
```

浏览器访问 `http://localhost:5173`

## 使用流程

1. 上传精灵图（拖放或点击浏览）
2. 设置帧宽度和帧高度（如 32×32）
3. 缩放倍率选"自动" → 点击 **"开始切割"**
4. 在网格编辑区选择编辑模式 → 点击格子标记帧状态
5. 在动画分组区创建分组（如 idle / walk / attack）
6. 预览动画 → 导出 PNG / GIF

## 技术栈

- React 18 + TypeScript
- Vite 5
- Canvas API（像素级图像处理）
- gif.js.optimized（GIF 编码）

## 构建部署

```bash
npm run build     # 构建到 dist/
npm run deploy    # 部署到 GitHub Pages
```
