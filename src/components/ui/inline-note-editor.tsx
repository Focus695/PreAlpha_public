/**
 * InlineNoteEditor Component
 *
 * 内联文本编辑器，用于编辑地址备注
 * - 点击编辑图标进入编辑模式
 * - Enter 保存，Escape 取消，blur 保存
 */

import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '@/components/ui/icons';
import { zh } from '@/lib/translations';

interface InlineNoteEditorProps {
  /** 当前值 */
  value: string | undefined;
  /** 未设置值时显示的占位符 */
  placeholder?: string;
  /** 值变化回调 */
  onChange: (value: string | undefined) => void;
  /** 自定义类名 */
  className?: string;
}

export function InlineNoteEditor({
  value,
  placeholder = zh.ui.inlineNoteEditor.placeholder,
  onChange,
  className = '',
}: InlineNoteEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  // 进入编辑模式时聚焦输入框
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // 当外部值变化时更新草稿
  useEffect(() => {
    if (!isEditing) {
      setDraft(value ?? '');
    }
  }, [value, isEditing]);

  const handleSave = () => {
    const trimmed = draft.trim();
    onChange(trimmed || undefined);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraft(value ?? '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  // 编辑模式
  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        placeholder={placeholder}
        className={`
          w-full max-w-[180px] rounded border border-brand bg-surface1 px-2 py-0.5
          text-sm text-txt-main outline-none
          focus:ring-1 focus:ring-brand
          ${className}
        `}
      />
    );
  }

  // 显示模式
  const displayValue = value || placeholder;
  const isPlaceholder = !value;

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`
        group/edit inline-flex items-center gap-1.5 rounded px-1 -ml-1
        transition-colors hover:bg-surface2
        ${className}
      `}
    >
      <span
        className={`
          font-semibold transition-colors
          ${isPlaceholder ? 'text-txt-muted' : 'text-txt-main'}
          group-hover/edit:text-brand
        `}
      >
        {displayValue}
      </span>
      <Icons.Edit
        size={12}
        className="text-txt-muted transition-colors group-hover/edit:text-brand"
      />
    </button>
  );
}
