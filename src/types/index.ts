/**
 * PreAlpha 核心类型定义
 *
 * 这是整个项目的类型基础，所有模块都依赖这些定义
 */

// ============================================================
// 基础类型
// ============================================================

/** 支持的预测市场平台 */
export type Platform = 'polymarket' | 'opinion';

/** 交易方向 */
export type TradeSide = 'BUY' | 'SELL';

/** 交易结果预测 */
export type TradeOutcome = 'YES' | 'NO';

/** 市场状态 */
export type MarketStatus = 'active' | 'resolved' | 'cancelled';

/** 以太坊地址（42字符，0x 开头） */
export type EthAddress = `0x${string}`;

/** 时间范围过滤器 */
export type TimeRange = '24h' | '7d' | '30d' | 'all';

// ============================================================
// 地址画像 (Address Profile)
// ============================================================

/**
 * 地址画像 - 核心数据模型
 */
export interface AddressProfile {
  /** 用户名 */
  userName: string;

  /** 以太坊地址 */
  address: EthAddress;

  /** 所属平台 */
  platform: Platform;

  /** 总盈亏金额 (USD) */
  totalPnl: number;

  /** 总投资回报率 (0-1) */
  totalRoi: number;

  /** 胜率 (0-1)，盈利单数/总单数 - null if not provided by API */
  winRate: number | null;

  /**
   * Smart Score (0-100)
   * 综合评分，衡量地址"聪明程度" - null if not provided by API
   */
  smartScore: number | null;

  /** 总交易量 (USD) */
  totalVolume: number;

  /** 交易次数 */
  tradeCount: number;

  /** 标签列表 */
  tags: SmartMoneyTag[];

  /**
   * 细分领域专业度
   * key: 领域名称 (如 "sports", "politics")
   * value: 该领域的胜率
   */
  specializations: Record<string, number>;

  /** 最后活跃时间 */
  lastActiveAt: Date;

  /** 数据更新时间 */
  updatedAt: Date;

  // ============================================================
  // 社交身份
  // ============================================================

  /** ENS 域名 */
  ensName?: string;

  /** Twitter 账号 */
  twitterHandle?: string;

  /** 头像 URL */
  avatarUrl?: string;

  // ============================================================
  // 平台链接
  // ============================================================

  /** Polymarket 个人页面链接 */
  polymarketUrl?: string;

  /** Opinion 个人页面链接 */
  opinionUrl?: string;
}

/**
 * 聪明钱标签
 * 基于交易行为自动生成
 */
export type SmartMoneyTag =
  | 'god_level' // 胜率>70% 的高水平交易者
  | 'sports_whale' // 体育领域高胜率大户
  | 'counter_staker' // 与大众情绪相反且高胜率
  | 'event_insider' // 事件前1h内早期进入
  | 'bcp_king' // 长期击败收盘价
  | 'alpha_hunter' // 低赔率区(0.1-0.2)高胜率
  | 'arb_hunter' // 跨平台套利
  | 'consecutive_wins' // 连续10次下注获胜
  | 'bot'; // 机器人/自动化交易账户

// ============================================================
// 交易记录 (Trade)
// ============================================================

/**
 * 交易记录
 */
export interface Trade {
  /** 交易哈希 */
  txHash: string;

  /** 区块号 */
  blockNumber: number;

  /** 交易时间戳 */
  timestamp: Date;

  /** 平台 */
  platform: Platform;

  /** 市场 ID */
  marketId: string;

  /** 交易地址 */
  address: EthAddress;

  /** 交易方向 */
  side: TradeSide;

  /** 预测结果 */
  outcome: TradeOutcome;

  /** 入场价格 (0-1) */
  price: number;

  /** 交易金额 (USD) */
  amount: number;

  /** 收盘价（市场结算时填充） */
  closingPrice?: number;
}

// ============================================================
// 市场 (Market)
// ============================================================

/**
 * 预测市场
 */
export interface Market {
  /** 市场 ID */
  id: string;

  /** 平台 */
  platform: Platform;

  /** 市场标题 */
  title: string;

  /** 市场描述 */
  description: string;

  /** 分类 */
  category: MarketCategory;

  /** 市场状态 */
  status: MarketStatus;

  /** YES 当前价格 */
  yesPrice: number;

  /** NO 当前价格 */
  noPrice: number;

  /** 总交易量 */
  volume: number;

  /** 流动性深度 */
  liquidity: number;

  /** 结算时间（如已结算） */
  resolvedAt?: Date;

  /** 结算结果 */
  resolution?: TradeOutcome;

  /** 创建时间 */
  createdAt: Date;

  /** 结束时间 */
  endDate: Date;

  /** 市场图片 URL */
  imageUrl?: string;
}

/** 市场分类 */
export type MarketCategory =
  | 'sports' // 体育
  | 'politics' // 政治
  | 'crypto' // 加密货币
  | 'economics' // 经济
  | 'entertainment' // 娱乐
  | 'science' // 科学
  | 'other'; // 其他

// ============================================================
// 信号 (Signal)
// ============================================================

/**
 * 实时信号
 * 推送给用户的 Alpha 信号
 */
export interface Signal {
  /** 信号 ID */
  id: string;

  /** 信号类型 */
  type: SignalType;

  /** 相关市场 */
  market: Market;

  /** 触发地址列表 */
  addresses: EthAddress[];

  /** SmartScore (0-100) - 触发该信号的地址的智能评分 */
  smartScore: number | null;

  /** 信号描述 */
  description: string;

  /** 创建时间 */
  createdAt: Date;

  /** 元数据 */
  metadata: Record<string, unknown>;
}

/** 信号类型 */
export type SignalType =
  | 'smart_money_entry' // 聪明钱入场
  | 'anomaly_detected' // 异动提醒
  | 'divergence_alert' // 背离监控（散户 vs 聪明钱）
  | 'early_position' // 早期埋伏
  | 'exit_warning' // 撤退预警
  | 'reverse_indicator'; // 冥灯监控

// ============================================================
// 排行榜 (Leaderboard)
// ============================================================

/**
 * 排行榜条目
 */
export interface LeaderboardEntry {
  rank: number;
  address: EthAddress;
  platform: Platform;
  value: number; // 排序值（根据类型不同）
  profile: AddressProfile;
}

/** 排行榜类型 */
export type LeaderboardType =
  | 'pnl' // 按利润排序
  | 'roi' // 按 ROI 排序
  | 'win_rate' // 按胜率排序
  | 'bcp' // 按 BCP 排序
  | 'smart_score'; // 按综合评分排序

// ============================================================
// 算法相关类型
// ============================================================

/**
 * Smart Score 权重配置
 */
export interface ScoreWeights {
  winRate: number; // 默认 0.15
  specialization: number; // 默认 0.10
  pnl: number; // 默认 0.30
  roi: number; // 默认 0.20
}

/** 默认权重 */
export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  winRate: 0.15,
  specialization: 0.1,
  pnl: 0.3,
  roi: 0.2,
};

// ============================================================
// API 响应类型
// ============================================================

/**
 * 统一 API 响应格式
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta: {
    timestamp: string;
    requestId: string;
    extraFields?: Record<string, unknown>;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================================
// 工具类型
// ============================================================

/** 使所有属性可选（深度） */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** 提取可选属性 */
export type OptionalKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? K : never;
}[keyof T];

/** Result 类型 - 用于错误处理 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };
