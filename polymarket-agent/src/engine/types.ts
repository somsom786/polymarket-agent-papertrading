/**
 * Paper Trading Engine Types
 */

// Virtual balance
export interface VirtualBalance {
    cash: number;
    totalValue: number;
    initialBalance: number;
    lastUpdated: Date;
}

// Position in a market
export interface Position {
    id: string;
    marketId: string;
    marketQuestion: string;
    tokenId: string;
    outcome: string; // 'YES', 'NO', or custom outcome name for multi-outcome
    shares: number;
    avgPrice: number;
    currentPrice: number;
    unrealizedPnL: number;
    openedAt: Date;
}

// Trade record
export interface Trade {
    id: string;
    timestamp: Date;
    marketId: string;
    marketQuestion: string;
    tokenId: string;
    outcome: string; // 'YES', 'NO', or custom outcome name
    side: 'BUY' | 'SELL';
    shares: number;
    price: number;
    totalCost: number;
    fees: number;
    realizedPnL?: number;
}

// Portfolio summary
export interface PortfolioSummary {
    cash: number;
    positionsValue: number;
    totalValue: number;
    totalPnL: number;
    totalPnLPercent: number;
    positionCount: number;
    tradeCount: number;
    winRate: number;
}

// Order request
export interface OrderRequest {
    marketId: string;
    marketQuestion: string;
    tokenId: string;
    outcome: string; // 'YES', 'NO', or custom outcome name
    side: 'BUY' | 'SELL';
    shares: number;
    price: number;
}

// Order result
export interface OrderResult {
    success: boolean;
    trade?: Trade;
    error?: string;
    newBalance?: number;
}
