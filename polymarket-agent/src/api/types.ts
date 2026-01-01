/**
 * Polymarket API Types
 * Based on the official CLOB API documentation
 */

// Market token representing an outcome
export interface Token {
    token_id: string;
    outcome: string; // "Yes" or "No" (or custom outcome name)
}

// Rewards configuration for a market
export interface Rewards {
    min_size: number;
    max_spread: number;
    event_start_date: string;
    event_end_date: string;
    in_game_multiplier: number;
    reward_epoch: number;
}

// Full market data from Polymarket
export interface Market {
    condition_id: string;
    question_id: string;
    tokens: Token[];  // Changed to array to support multi-outcome
    rewards: Rewards;
    minimum_order_size: string;
    minimum_tick_size: string;
    category: string;
    end_date_iso: string;
    game_start_time: string;
    question: string;
    market_slug: string;
    min_incentive_size: string;
    max_incentive_spread: string;
    active: boolean;
    closed: boolean;
    seconds_delay: number;
    icon: string;
    fpmm: string;
}

// Simplified market for lighter payloads
export interface SimplifiedMarket {
    condition_id: string;
    tokens: Token[];
    rewards: Rewards;
    min_incentive_size: string;
    max_incentive_spread: string;
    active: boolean;
    closed: boolean;
}

// Paginated response
export interface MarketsResponse {
    limit: number;
    count: number;
    next_cursor: string;
    data: Market[];
}

// Order book entry
export interface BookEntry {
    price: string;
    size: string;
}

// Order book for a token
export interface OrderBook {
    market: string;
    asset_id: string;
    bids: BookEntry[];
    asks: BookEntry[];
    hash: string;
    timestamp: string;
}

// Token price info
export interface TokenPrice {
    token_id: string;
    price: string;
}

// Outcome with price for multi-outcome markets
export interface OutcomeWithPrice {
    name: string;
    tokenId: string;
    price: number;
    volume?: number;
}

// Market with enriched price data
export interface EnrichedMarket extends Market {
    yesPrice: number;
    noPrice: number;
    volume24h?: number;
    liquidity?: number;
    // Multi-outcome support
    outcomes?: OutcomeWithPrice[];
    isMultiOutcome?: boolean;
}

// Event containing multiple related markets (e.g., "Super Bowl Winner")
export interface PolymarketEvent {
    id: string;
    slug: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    category: string;
    volume: number;
    liquidity: number;
    markets: EventMarket[];
    closed: boolean;
}

// Individual market within an event
export interface EventMarket {
    id: string;
    question: string;
    conditionId: string;
    slug: string;
    outcomes: string;  // JSON string like '["Yes", "No"]'
    outcomePrices: string; // JSON string like '["0.14", "0.86"]'
    volume: string;
    active: boolean;
    closed: boolean;
    clobTokenIds: string; // JSON string with token IDs
}

// Enriched event with parsed data
export interface EnrichedEvent {
    id: string;
    title: string;
    category: string;
    endDate: string;
    isClosed: boolean;
    isMultiOutcome: boolean;
    outcomeCount: number;
    totalVolume: number;
    outcomes: OutcomeWithPrice[];
    markets: EnrichedEventMarket[];
}

// Individual enriched market within an event
export interface EnrichedEventMarket {
    id: string;
    question: string;
    conditionId: string;
    tokenId: string;
    price: number;
    volume: number;
    isYesNoMarket: boolean;
}
