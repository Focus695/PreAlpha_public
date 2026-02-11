import { useState, useRef, useEffect } from 'react';
import { Icons } from './icons';
import { cn } from '@/lib/utils';

export interface Option<T> {
  label: string;
  value: T;
}

interface CustomSelectProps<T> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  icon?: React.ReactNode;
  label?: string; // Prefix label like "Sort by"
  className?: string;
}

export function CustomSelect<T extends string>({
  options,
  value,
  onChange,
  icon,
  label,
  className,
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded border border-border bg-surface2 px-4 py-2 text-sm font-medium text-txt-secondary hover:border-brand/30 hover:text-txt-main transition-colors",
          isOpen && "border-brand/30 text-txt-main",
          className
        )}
      >
        {icon}
        <span>{label ? `${label}: ${selectedOption?.label}` : selectedOption?.label}</span>
        <Icons.ChevronDown size={14} className={cn("transition-transform ml-1", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 z-50 w-full min-w-[160px] overflow-hidden rounded-md border border-border bg-surface2 shadow-lg animate-in fade-in zoom-in-95 duration-100">
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex w-full items-center px-4 py-2 text-sm text-left hover:bg-surface1 transition-colors",
                  option.value === value ? "text-brand bg-brand/5" : "text-txt-secondary hover:text-txt-main"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

