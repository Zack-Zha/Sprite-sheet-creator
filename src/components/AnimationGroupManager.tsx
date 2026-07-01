import { useState } from 'react';
import type { AnimationGroup, CellState } from '../types';
import './AnimationGroupManager.css';

interface AnimationGroupManagerProps {
  groups: AnimationGroup[];
  activeGroup: string | null;
  onCreateGroup: (name: string, state: CellState, fps: number) => void;
  onDeleteGroup: (name: string) => void;
  onSelectGroup: (name: string | null) => void;
  hasGrid: boolean;
}

const STATE_OPTIONS: { value: CellState; label: string }[] = [
  { value: 'idle', label: '待机 (idle)' },
  { value: 'walk', label: '行走 (walk)' },
  { value: 'attack', label: '攻击 (attack)' },
];

export function AnimationGroupManager({
  groups,
  activeGroup,
  onCreateGroup,
  onDeleteGroup,
  onSelectGroup,
  hasGrid,
}: AnimationGroupManagerProps) {
  const [newName, setNewName] = useState('');
  const [newState, setNewState] = useState<CellState>('idle');
  const [newFps, setNewFps] = useState(8);

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreateGroup(newName.trim(), newState, newFps);
    setNewName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreate();
  };

  return (
    <div className="group-manager">
      <h3 className="group-manager__title">动画分组</h3>

      {/* Create new group */}
      <div className="group-manager__create">
        <input
          className="group-manager__input"
          type="text"
          placeholder="分组名称"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!hasGrid}
        />
        <select
          className="group-manager__select"
          value={newState}
          onChange={(e) => setNewState(e.target.value as CellState)}
          disabled={!hasGrid}
        >
          {STATE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          className="group-manager__fps"
          type="number"
          min="1"
          max="60"
          value={newFps}
          onChange={(e) => setNewFps(Number(e.target.value) || 8)}
          disabled={!hasGrid}
        />
        <span className="group-manager__fps-label">FPS</span>
        <button
          className="group-manager__create-btn"
          onClick={handleCreate}
          disabled={!hasGrid || !newName.trim()}
        >
          + 创建
        </button>
      </div>

      {/* Group list */}
      <div className="group-manager__list">
        {groups.length === 0 ? (
          <p className="group-manager__empty">暂无分组，先在网格中标记帧状态后点击"创建"</p>
        ) : (
          groups.map((group) => (
            <div
              key={group.name}
              className={`group-manager__item ${activeGroup === group.name ? 'group-manager__item--active' : ''}`}
              onClick={() =>
                onSelectGroup(activeGroup === group.name ? null : group.name)
              }
            >
              <div className="group-manager__item-info">
                <span className="group-manager__item-name">{group.name}</span>
                <span className={`group-manager__item-state group-manager__item-state--${group.state}`}>
                  {group.state === 'idle' ? '待机' : group.state === 'walk' ? '行走' : '攻击'}
                </span>
                <span className="group-manager__item-meta">
                  {group.frameIndices.length} 帧 · {group.fps} FPS
                </span>
              </div>
              <button
                className="group-manager__delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteGroup(group.name);
                }}
                title="删除分组"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>

      {activeGroup && (
        <p className="group-manager__active-hint">
          当前播放：<strong>{activeGroup}</strong>
        </p>
      )}
    </div>
  );
}
