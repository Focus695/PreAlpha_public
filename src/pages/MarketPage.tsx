/**
 * Market Page
 */

import { zh } from '@/lib/translations';

export function MarketPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <h1 className="text-3xl font-bold text-txt-main md:text-4xl lg:text-5xl">
        {zh.marketPage.comingSoon}
      </h1>
    </div>
  );
}

