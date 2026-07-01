import { useState, useRef, useCallback } from 'react';
import './DropZone.css';

interface DropZoneProps {
  onFileLoad: (file: File) => void;
  hasImage: boolean;
  imageName?: string;
}

export function DropZone({ onFileLoad, hasImage, imageName }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptedTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

  const validateAndLoad = useCallback(
    (file: File) => {
      setError(null);
      if (!acceptedTypes.includes(file.type)) {
        setError('不支持的文件格式，请使用 PNG、JPEG、GIF 或 WebP 格式。');
        return;
      }
      onFileLoad(file);
    },
    [onFileLoad]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) validateAndLoad(file);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndLoad(file);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="drop-zone-wrapper">
      <div
        className={`drop-zone ${isDragOver ? 'drop-zone--dragover' : ''} ${hasImage ? 'drop-zone--has-image' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleClick();
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          onChange={handleFileChange}
          className="drop-zone__input"
          tabIndex={-1}
        />
        {hasImage ? (
          <div className="drop-zone__content">
            <span className="drop-zone__icon">📁</span>
            <span className="drop-zone__text">{imageName || '图片已加载'}</span>
            <span className="drop-zone__hint">点击或拖放以替换图片</span>
          </div>
        ) : (
          <div className="drop-zone__content">
            <span className="drop-zone__icon">🖼️</span>
            <span className="drop-zone__text">
              {isDragOver ? '释放以上传精灵图' : '拖放精灵图到此处，或点击浏览'}
            </span>
            <span className="drop-zone__hint">支持 PNG、JPEG、GIF、WebP</span>
          </div>
        )}
      </div>
      {error && <p className="drop-zone__error">{error}</p>}
    </div>
  );
}
