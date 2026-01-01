/**
 * Portfolio Manager
 * Aggregates balance, positions, and trades into a unified view
 */

import type { PortfolioSummary, Position, Trade } from './types.js';
import { BalanceManager } from './balance.js';
import { PositionTracker } from './positions.js';
import { TradeExecutor } from './trades.js';

export class PortfolioManager {
    private balanceManager: BalanceManager;
    private positionTracker: PositionTracker;
    private tradeExecutor: TradeExecutor;

    constructor(initialBalance?: number) {
        this.balanceManager = new BalanceManager(initialBalance);
        this.positionTracker = new PositionTracker();
        this.tradeExecutor = new TradeExecutor(this.balanceManager, this.positionTracker);
    }

    /**
     * Get portfolio summary
     */
    getSummary(): PortfolioSummary {
        const cash = this.balanceManager.getCash();
        const positionsValue = this.positionTracker.getTotalValue();
        const totalValue = cash + positionsValue;
        const balance = this.balanceManager.getBalance();
        const totalPnL = totalValue - balance.initialBalance;
        const totalPnLPercent = (totalPnL / balance.initialBalance) * 100;

        return {
            cash,
            positionsValue,
            totalValue,
            totalPnL,
            totalPnLPercent,
            positionCount: this.positionTracker.getPositionCount(),
            tradeCount: this.tradeExecutor.getTradeCount(),
            winRate: this.tradeExecutor.getWinRate(),
        };
    }

    /**
     * Get balance manager
     */
    getBalanceManager(): BalanceManager {
        return this.balanceManager;
    }

    /**
     * Get position tracker
     */
    getPositionTracker(): PositionTracker {
        return this.positionTracker;
    }

    /**
     * Get trade executor
     */
    getTradeExecutor(): TradeExecutor {
        return this.tradeExecutor;
    }

    /**
     * Get all positions
     */
    getPositions(): Position[] {
        return this.positionTracker.getAllPositions();
    }

    /**
     * Get recent trades
     */
    getRecentTrades(count: number = 10): Trade[] {
        return this.tradeExecutor.getRecentTrades(count);
    }

    /**
     * Update portfolio with current prices
     */
    updatePrices(prices: Map<string, number>): void {
        this.positionTracker.updatePrices(prices);
        this.balanceManager.updateTotalValue(this.positionTracker.getTotalValue());
    }

    /**
     * Reset portfolio to initial state
     */
    reset(): void {
        this.balanceManager.reset();
        this.positionTracker.clear();
        this.tradeExecutor.clear();
    }

    /**
     * Serialize entire portfolio state
     */
    serialize(): string {
        return JSON.stringify({
            balance: this.balanceManager.serialize(),
            positions: this.positionTracker.serialize(),
            trades: this.tradeExecutor.serialize(),
        });
    }

    /**
     * Restore portfolio from serialized state
     */
    restore(data: string): void {
        try {
            const parsed = JSON.parse(data);
            if (parsed.balance) this.balanceManager.restore(parsed.balance);
            if (parsed.positions) this.positionTracker.restore(parsed.positions);
            if (parsed.trades) this.tradeExecutor.restore(parsed.trades);
        } catch {
            console.error('Failed to restore portfolio state');
        }
    }
}
