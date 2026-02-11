/**
 * Settings Dropdown Component
 *
 * 设置下拉菜单，包含"管理个人数据"等选项
 */

import { useEffect, useRef } from 'react';
import { Icons } from '@/components/ui/icons';
import { zh } from '@/lib/translations';

interface SettingsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onManagePersonalData: () => void;
}

export function SettingsDropdown({
  isOpen,
  onClose,
  onManagePersonalData,
}: SettingsDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Add event listener with a slight delay to avoid immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border bg-base shadow-lg z-[100] animate-in fade-in slide-in-from-top-2 duration-200"
    >
      <div className="p-1">
        <button
          onClick={() => {
            onManagePersonalData();
            onClose();
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-txt-secondary transition-colors hover:bg-surface1 hover:text-txt-main"
        >
          <Icons.Tag size={16} />
          <span>{zh.header.settings.managePersonalData}</span>
        </button>
      </div>
    </div>
  );
}

