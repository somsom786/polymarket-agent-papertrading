/**
 * Position Tracker
 * Manages open positions in prediction markets
 */

import { v4 as uuidv4 } from 'uuid';
import type { Position, OrderRequest } from './types.js';

export class PositionTracker {
    private positions: Map<string, Position> = new Map();

    /**
     * Get all positions
     */
    getAllPositions(): Position[] {
        return Array.from(this.positions.values());
    }

    /**
     * Get position by market and outcome
     */
    getPosition(marketId: string, outcome: string): Position | undefined {
        const key = `${marketId}-${outcome}`;
        return this.positions.get(key);
    }

    /**
     * Open or add to a position
     */
    addPosition(order: OrderRequest, shares: number, price: number): Position {
        const key = `${order.marketId}-${order.outcome}`;
        const existing = this.positions.get(key);

        if (existing) {
            // Average in to existing position
            const totalShares = existing.shares + shares;
            const totalCost = (existing.shares * existing.avgPrice) + (shares * price);
            const newAvgPrice = totalCost / totalShares;

            existing.shares = totalShares;
            existing.avgPrice = newAvgPrice;
            existing.currentPrice = price;
            existing.unrealizedPnL = (price - newAvgPrice) * totalShares;

            return existing;
        }

        // Create new position
        const position: Position = {
            id: uuidv4(),
            marketId: order.marketId,
            marketQuestion: order.marketQuestion,
            tokenId: order.tokenId,
            outcome: order.outcome,
            shares,
            avgPrice: price,
            currentPrice: price,
            unrealizedPnL: 0,
            openedAt: new Date(),
        };

        this.positions.set(key, position);
        return position;
    }

    /**
     * Reduce or close a position
     */
    reducePosition(marketId: string, outcome: string, shares: number, sellPrice: number): {
        success: boolean;
        realizedPnL: number;
        remainingShares: number;
    } {
        const key = `${marketId}-${outcome}`;
        const position = this.positions.get(key);

        if (!position || position.shares < shares) {
            return { success: false, realizedPnL: 0, remainingShares: position?.shares || 0 };
        }

        const realizedPnL = (sellPrice - position.avgPrice) * shares;
        position.shares -= shares;

        if (position.shares <= 0) {
            this.positions.delete(key);
            return { success: true, realizedPnL, remainingShares: 0 };
        }

        position.currentPrice = sellPrice;
        position.unrealizedPnL = (sellPrice - position.avgPrice) * position.shares;

        return { success: true, realizedPnL, remainingShares: position.shares };
    }

    /**
     * Update current prices for all positions
     */
    updatePrices(prices: Map<string, number>): void {
        for (const position of this.positions.values()) {
            const price = prices.get(position.tokenId);
            if (price !== undefined) {
                position.currentPrice = price;
                position.unrealizedPnL = (price - position.avgPrice) * position.shares;
            }
        }
    }

    /**
     * Get total value of all positions
     */
    getTotalValue(): number {
        let total = 0;
        for (const position of this.positions.values()) {
            total += position.shares * position.currentPrice;
        }
        return total;
    }

    /**
     * Get total unrealized P&L
     */
    getTotalUnrealizedPnL(): number {
        let total = 0;
        for (const position of this.positions.values()) {
            total += position.unrealizedPnL;
        }
        return total;
    }

    /**
     * Get number of open positions
     */
    getPositionCount(): number {
        return this.positions.size;
    }

    /**
     * Check if position exists
     */
    hasPosition(marketId: string, outcome: string): boolean {
        const key = `${marketId}-${outcome}`;
        return this.positions.has(key);
    }

    /**
     * Get position size
     */
    getPositionSize(marketId: string, outcome: string): number {
        const key = `${marketId}-${outcome}`;
        const position = this.positions.get(key);
        return position?.shares || 0;
    }

    /**
     * Serialize positions for storage
     */
    serialize(): string {
        const data = Array.from(this.positions.entries());
        return JSON.stringify(data);
    }

    /**
     * Restore positions from serialized data
     */
    restore(data: string): void {
        try {
            const parsed = JSON.parse(data);
            this.positions = new Map(parsed.map(([key, pos]: [string, Position]) => [
                key,
                { ...pos, openedAt: new Date(pos.openedAt) }
            ]));
        } catch {
            console.error('Failed to restore positions data');
        }
    }

    /**
     * Clear all positions
     */
    clear(): void {
        this.positions.clear();
    }
}
