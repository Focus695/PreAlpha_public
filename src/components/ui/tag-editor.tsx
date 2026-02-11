/**
 * TagEditor Component
 *
 * 标签编辑器，显示系统标签和用户自定义标签
 * - 系统标签不可删除
 * - 用户标签带用户图标前缀，可删除
 * - 可添加新的用户标签
 */

import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '@/components/ui/icons';
import { zh } from '@/lib/translations';

interface TagEditorProps {
  /** 系统标签（不可编辑） */
  systemTags: string[];
  /** 用户自定义标签 */
  userTags: string[];
  /** 添加标签回调 */
  onAddTag: (tag: string) => void;
  /** 删除标签回调 */
  onRemoveTag: (tag: string) => void;
}

/**
 * 系统标签组件
 * 特殊标签（god_level, sports_whale）使用高亮样式
 */
function SystemTag({ tag }: { tag: string }) {
  const isSpecial = tag === 'god_level' || tag === 'sports_whale';

  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-medium ${
        isSpecial
          ? 'border-accent/30 bg-accent/10 text-accent'
          : 'border-border bg-surface2 text-txt-secondary'
      }`}
    >
      {tag.replace(/_/g, ' ')}
    </span>
  );
}

/**
 * 用户标签组件
 * 带用户图标前缀和删除按钮
 */
function UserTag({ tag, onRemove }: { tag: string; onRemove: () => void }) {
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove();
  };

  return (
    <span className="inline-flex items-center gap-1 rounded border border-brand/30 bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">
      <Icons.User size={8} className="shrink-0" />
      <span>{tag}</span>
      <button
        type="button"
        onClick={handleRemove}
        className="ml-0.5 shrink-0 rounded-sm hover:bg-brand/20"
        title={zh.ui.tagEditor.removeTitle}
      >
        <Icons.X size={10} />
      </button>
    </span>
  );
}

/**
 * 添加标签按钮
 */
function AddTagButton({ onClick }: { onClick: () => void }) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-0.5 rounded border border-dashed border-border px-2 py-0.5 text-[10px] text-txt-muted transition-colors hover:border-brand hover:text-brand"
      title={zh.ui.tagEditor.addTitle}
    >
      <Icons.Plus size={10} />
      <span>{zh.ui.tagEditor.addLabel}</span>
    </button>
  );
}

/**
 * 标签输入框
 */
function TagInput({
  value,
  onChange,
  onSubmit,
  onCancel,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  const handleBlur = () => {
    // 如果有值则提交，否则取消
    if (value.trim()) {
      onSubmit();
    } else {
      onCancel();
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onClick={(e) => e.stopPropagation()}
      placeholder={zh.ui.tagEditor.placeholder}
      className="w-20 rounded border border-brand bg-surface1 px-1.5 py-0.5 text-[10px] text-txt-main outline-none focus:ring-1 focus:ring-brand"
      maxLength={20}
    />
  );
}

export function TagEditor({
  systemTags,
  userTags,
  onAddTag,
  onRemoveTag,
}: TagEditorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTag, setNewTag] = useState('');

  const handleStartAdding = () => {
    setIsAdding(true);
    setNewTag('');
  };

  const handleSubmit = () => {
    const trimmed = newTag.trim().toLowerCase();
    if (trimmed) {
      // 检查是否与系统标签或已有用户标签重复
      const allExistingTags = [
        ...systemTags.map((t) => t.toLowerCase()),
        ...userTags.map((t) => t.toLowerCase()),
      ];
      if (!allExistingTags.includes(trimmed)) {
        onAddTag(trimmed);
      }
    }
    setNewTag('');
    setIsAdding(false);
  };

  const handleCancel = () => {
    setNewTag('');
    setIsAdding(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* 系统标签 */}
      {systemTags.map((tag) => (
        <SystemTag key={`sys-${tag}`} tag={tag} />
      ))}

      {/* 用户标签 */}
      {userTags.map((tag) => (
        <UserTag key={`user-${tag}`} tag={tag} onRemove={() => onRemoveTag(tag)} />
      ))}

      {/* 添加标签 */}
      {isAdding ? (
        <TagInput
          value={newTag}
          onChange={setNewTag}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      ) : (
        <AddTagButton onClick={handleStartAdding} />
      )}
    </div>
  );
}
