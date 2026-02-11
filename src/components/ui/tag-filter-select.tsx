/**
 * Tag Filter Select Component
 *
 * 标签筛选器 - 基于系统标签筛选聪明钱钱包
 * 目前仅用于UI展示和埋点，实际过滤逻辑待后端API支持
 */

import { CustomSelect, type Option } from '@/components/ui/custom-select';
import { Icons } from '@/components/ui/icons';
import { zh } from '@/lib/translations';
import type { SmartMoneyTag } from '@/types';

type TagFilterValue = SmartMoneyTag | 'all';

/** 标签选项配置 */
const TAG_OPTIONS: Option<TagFilterValue>[] = [
  { label: zh.smartMoneyPage.tags.all, value: 'all' },
  // TODO: 暂时移除标签筛选项，等待后续添加新的筛选项
  // { label: zh.smartMoneyPage.tags.god_level, value: 'god_level' },
  // { label: zh.smartMoneyPage.tags.sports_whale, value: 'sports_whale' },
  // { label: zh.smartMoneyPage.tags.counter_staker, value: 'counter_staker' },
  // { label: zh.smartMoneyPage.tags.event_insider, value: 'event_insider' },
  // { label: zh.smartMoneyPage.tags.bcp_king, value: 'bcp_king' },
  // { label: zh.smartMoneyPage.tags.alpha_hunter, value: 'alpha_hunter' },
  // { label: zh.smartMoneyPage.tags.arb_hunter, value: 'arb_hunter' },
  // { label: zh.smartMoneyPage.tags.consecutive_wins, value: 'consecutive_wins' },
];

export interface TagFilterSelectProps {
  value: TagFilterValue;
  onChange: (value: TagFilterValue) => void;
  className?: string;
}

export function TagFilterSelect({ value, onChange, className }: TagFilterSelectProps) {
  return (
    <CustomSelect
      options={TAG_OPTIONS}
      value={value}
      onChange={onChange}
      icon={<Icons.Tag size={14} />}
      className={className}
    />
  );
}
