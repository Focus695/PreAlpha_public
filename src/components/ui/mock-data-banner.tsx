/**
 * Mock Data Banner
 *
 * Displays a warning banner when data is from mock fallback
 */

import { Icons } from './icons';

interface MockDataBannerProps {
  show: boolean;
}

export function MockDataBanner({ show }: MockDataBannerProps) {
  if (!show) return null;

  return (
    <div className="mb-6 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
      <div className="flex items-start gap-3">
        <Icons.AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-medium text-yellow-500 mb-1">使用模拟数据</h4>
          <p className="text-sm text-txt-secondary">
            无法连接到 API。以下显示的数据仅供演示，不代表真实交易活动。
          </p>
        </div>
      </div>
    </div>
  );
}
