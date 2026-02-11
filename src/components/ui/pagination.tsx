import { zh } from '@/lib/translations';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  className?: string;
  showInfo?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  isLoading = false,
  className = '',
  showInfo = true,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={`flex items-center justify-between border-t border-border pt-6 ${className}`}>
      <div className="text-sm text-txt-muted">
        {showInfo && totalItems !== undefined && pageSize !== undefined && (
          <span>
            {zh.smartMoneyPage.paginationLabel(
              (currentPage - 1) * pageSize + 1,
              Math.min(currentPage * pageSize, totalItems),
              totalItems
            )}
          </span>
        )}
        {showInfo && (totalItems === undefined || pageSize === undefined) && (
           <span>{zh.common.pageLabel(currentPage, totalPages)}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || isLoading}
          className="rounded border border-border bg-surface1 px-3 py-1.5 text-sm text-txt-main transition-all hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-surface1"
        >
          {zh.common.previous}
        </button>

        <div className="flex gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
            // Display logic: first page, last page, current page, one page before and after current
            const showPage =
              page === 1 ||
              page === totalPages ||
              page === currentPage ||
              page === currentPage - 1 ||
              page === currentPage + 1;

            if (!showPage) {
              // Show ellipsis
              if (page === currentPage - 2 || page === currentPage + 2) {
                return (
                  <span key={page} className="px-2 text-txt-muted">
                    ...
                  </span>
                );
              }
              return null;
            }

            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                disabled={isLoading}
                className={`rounded px-3 py-1.5 text-sm transition-all ${
                  currentPage === page
                    ? 'bg-brand/10 text-brand shadow-sm'
                    : 'border border-border bg-surface1 text-txt-main hover:bg-surface2'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || isLoading}
          className="rounded border border-border bg-surface1 px-3 py-1.5 text-sm text-txt-main transition-all hover:bg-surface2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-surface1"
        >
          {zh.common.next}
        </button>
      </div>
    </div>
  );
}

