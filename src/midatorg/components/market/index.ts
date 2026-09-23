// Owned by the "home" feature agent (spec §7).
export { MarketCard, MarketCardSkeleton } from './MarketCard';
export type { MarketCardProps } from './MarketCard';
export { MarketGrid } from './MarketGrid';
export type { MarketGridProps } from './MarketGrid';
export { CategoryChips } from './CategoryChips';
export type { CategoryChipsProps } from './CategoryChips';
export { SearchField, SEARCH_DEBOUNCE_MS } from './SearchField';
export type { SearchFieldProps } from './SearchField';
export { SortMenu } from './SortMenu';
export type { SortMenuProps } from './SortMenu';
export { TrendingStrip } from './TrendingStrip';
export type { TrendingStripProps } from './TrendingStrip';
export { Sparkline } from './Sparkline';
export type { SparklineProps, SparklineTone } from './Sparkline';
export { sparklineGeometry, SPARKLINE_PAD } from './sparklineGeometry';
export type { SparklineGeometry } from './sparklineGeometry';
export { EventThumb } from './EventThumb';
export type { EventThumbProps } from './EventThumb';
export { fetchSparklines, useSparklines, sparklinesKey, SPARKLINE_DAYS } from './sparklines';
export type { SparklineSeries } from './sparklines';
export {
  eventHref,
  parseHomeParams,
  buildHomeParams,
  cardStateOf,
  isPastEvent,
  rankTrending,
  demandScore,
  sparklineTone,
  seriesFromSnapshots,
  eventMeta,
  summarise,
  isSingular,
  pluralSuffix,
  HOME_PAGE_SIZE,
  TRENDING_COUNT,
  MARKET_SORTS,
  DEFAULT_SORT,
} from './helpers';
export type { HomeParams, CardState, SnapshotPoint } from './helpers';
