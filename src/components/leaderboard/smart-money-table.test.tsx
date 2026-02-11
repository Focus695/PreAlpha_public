/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect, mock } from 'bun:test';
import type { AddressProfile } from '@/types';
import { renderWithProviders, createUserEvent } from '@/test-utils';
import { createMockLeaderboardEntry } from '@/tests/fixtures/leaderboard';
import SmartMoneyTable from './smart-money-table';

describe('SmartMoneyTable', () => {
  it('renders leaderboard rows with formatted metrics', async () => {
    const firstEntry = createMockLeaderboardEntry();
    const secondEntry = createMockLeaderboardEntry(
      { rank: 2 },
      {
      address: '0x9876543210abcdef9876543210abcdef98765432',
      ensName: 'alpha.eth',
      totalPnl: -25000,
      totalRoi: -0.12,
      winRate: 0.45,
        tags: ['sports_whale'],
      } satisfies Partial<AddressProfile>
    );

    const view = await renderWithProviders(
      <SmartMoneyTable entries={[firstEntry, secondEntry]} />
    );

    expect(view.getByText('oracle.eth')).toBeInTheDocument();
    expect(view.getByText('alpha.eth')).toBeInTheDocument();
    expect(view.getByText(/\+\$150,000/)).toBeInTheDocument();
    expect(view.getByText(/-\$25,000/)).toBeInTheDocument();
  });

  it('calls onSelectTrader when a row is clicked', async () => {
    const onSelectTrader = mock(() => {});
    const entry = createMockLeaderboardEntry();

    const view = await renderWithProviders(
      <SmartMoneyTable entries={[entry]} onSelectTrader={onSelectTrader} />
    );

    const user = await createUserEvent();
    const rows = view.getAllByRole('row');
    const dataRow = rows.find((row) => row.textContent?.includes('oracle.eth'));
    if (!dataRow) {
      throw new Error('Expected to find row containing oracle.eth');
    }
    await user.click(dataRow);

    expect(onSelectTrader).toHaveBeenCalledTimes(1);
    expect(onSelectTrader).toHaveBeenCalledWith(entry);
  });
});

