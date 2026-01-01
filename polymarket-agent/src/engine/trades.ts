/**
 * Trade Executor and History
 * Handles paper trade execution and maintains trade history
 */

import { v4 as uuidv4 } from 'uuid';
import type { Trade, OrderRequest, OrderResult } from './types.js';
import { BalanceManager } from './balance.js';
import { PositionTracker } from './positions.js';

const FEE_RATE = 0.001; // 0.1% fee

export class TradeExecutor {
    private history: Trade[] = [];
    private balanceManager: BalanceManager;
    private positionTracker: PositionTracker;

    constructor(balanceManager: BalanceManager, positionTracker: PositionTracker) {
        this.balanceManager = balanceManager;
        this.positionTracker = positionTracker;
    }

    /**
     * Execute a paper trade
     */
    execute(order: OrderRequest): OrderResult {
        if (order.side === 'BUY') {
            return this.executeBuy(order);
        } else {
            return this.executeSell(order);
        }
    }

    /**
     * Execute a buy order
     */
    private executeBuy(order: OrderRequest): OrderResult {
        const totalCost = order.shares * order.price;
        const fees = totalCost * FEE_RATE;
        const totalWithFees = totalCost + fees;

        // Check if we can afford it
        if (!this.balanceManager.canAfford(totalWithFees)) {
            return {
                success: false,
                error: `Insufficient funds. Need $${totalWithFees.toFixed(2)}, have $${this.balanceManager.getCash().toFixed(2)}`,
            };
        }

        // Deduct cash
        this.balanceManager.deductCash(totalWithFees);

        // Add to position
        this.positionTracker.addPosition(order, order.shares, order.price);

        // Record trade
        const trade: Trade = {
            id: uuidv4(),
            timestamp: new Date(),
            marketId: order.marketId,
            marketQuestion: order.marketQuestion,
            tokenId: order.tokenId,
            outcome: order.outcome,
            side: 'BUY',
            shares: order.shares,
            price: order.price,
            totalCost,
            fees,
        };

        this.history.push(trade);

        return {
            success: true,
            trade,
            newBalance: this.balanceManager.getCash(),
        };
    }

    /**
     * Execute a sell order
     */
    private executeSell(order: OrderRequest): OrderResult {
        // Check if we have the position
        const positionSize = this.positionTracker.getPositionSize(order.marketId, order.outcome);

        if (positionSize < order.shares) {
            return {
                success: false,
                error: `Insufficient shares. Have ${positionSize}, trying to sell ${order.shares}`,
            };
        }

        // Reduce position and get realized P&L
        const result = this.positionTracker.reducePosition(
            order.marketId,
            order.outcome,
            order.shares,
            order.price
        );

        if (!result.success) {
            return {
                success: false,
                error: 'Failed to reduce position',
            };
        }

        // Calculate sale proceeds
        const totalProceeds = order.shares * order.price;
        const fees = totalProceeds * FEE_RATE;
        const netProceeds = totalProceeds - fees;

        // Add cash
        this.balanceManager.addCash(netProceeds);

        // Record trade
        const trade: Trade = {
            id: uuidv4(),
            timestamp: new Date(),
            marketId: order.marketId,
            marketQuestion: order.marketQuestion,
            tokenId: order.tokenId,
            outcome: order.outcome,
            side: 'SELL',
            shares: order.shares,
            price: order.price,
            totalCost: totalProceeds,
            fees,
            realizedPnL: result.realizedPnL,
        };

        this.history.push(trade);

        return {
            success: true,
            trade,
            newBalance: this.balanceManager.getCash(),
        };
    }

    /**
     * Get all trade history
     */
    getHistory(): Trade[] {
        return [...this.history];
    }

    /**
     * Get recent trades
     */
    getRecentTrades(count: number = 10): Trade[] {
        return this.history.slice(-count).reverse();
    }

    /**
     * Get trade count
     */
    getTradeCount(): number {
        return this.history.length;
    }

    /**
     * Get winning trades count
     */
    getWinningTradesCount(): number {
        return this.history.filter(t => t.side === 'SELL' && (t.realizedPnL || 0) > 0).length;
    }

    /**
     * Get total realized P&L
     */
    getTotalRealizedPnL(): number {
        return this.history.reduce((sum, t) => sum + (t.realizedPnL || 0), 0);
    }

    /**
     * Get total fees paid
     */
    getTotalFees(): number {
        return this.history.reduce((sum, t) => sum + t.fees, 0);
    }

    /**
     * Get win rate
     */
    getWinRate(): number {
        const sellTrades = this.history.filter(t => t.side === 'SELL');
        if (sellTrades.length === 0) return 0;

        const winningTrades = sellTrades.filter(t => (t.realizedPnL || 0) > 0);
        return (winningTrades.length / sellTrades.length) * 100;
    }

    /**
     * Serialize trade history for storage
     */
    serialize(): string {
        return JSON.stringify(this.history);
    }

    /**
     * Restore trade history from serialized data
     */
    restore(data: string): void {
        try {
            const parsed = JSON.parse(data);
            this.history = parsed.map((t: Trade) => ({
                ...t,
                timestamp: new Date(t.timestamp),
            }));
        } catch {
            console.error('Failed to restore trade history');
        }
    }

    /**
     * Clear trade history
     */
    clear(): void {
        this.history = [];
    }
}
