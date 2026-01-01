/**
 * Virtual Balance Manager
 * Manages the paper trading cash balance
 */

import type { VirtualBalance } from './types.js';

const DEFAULT_INITIAL_BALANCE = 100000;

export class BalanceManager {
    private balance: VirtualBalance;

    constructor(initialBalance?: number) {
        const initial = initialBalance ||
            Number(process.env.INITIAL_BALANCE) ||
            DEFAULT_INITIAL_BALANCE;

        this.balance = {
            cash: initial,
            totalValue: initial,
            initialBalance: initial,
            lastUpdated: new Date(),
        };
    }

    /**
     * Get current balance
     */
    getBalance(): VirtualBalance {
        return { ...this.balance };
    }

    /**
     * Get available cash
     */
    getCash(): number {
        return this.balance.cash;
    }

    /**
     * Check if we have enough cash for a purchase
     */
    canAfford(amount: number): boolean {
        return this.balance.cash >= amount;
    }

    /**
     * Deduct cash for a purchase
     */
    deductCash(amount: number): boolean {
        if (!this.canAfford(amount)) {
            return false;
        }

        this.balance.cash -= amount;
        this.balance.lastUpdated = new Date();
        return true;
    }

    /**
     * Add cash from a sale
     */
    addCash(amount: number): void {
        this.balance.cash += amount;
        this.balance.lastUpdated = new Date();
    }

    /**
     * Update total portfolio value (cash + positions)
     */
    updateTotalValue(positionsValue: number): void {
        this.balance.totalValue = this.balance.cash + positionsValue;
        this.balance.lastUpdated = new Date();
    }

    /**
     * Get profit/loss from initial balance
     */
    getPnL(): { absolute: number; percent: number } {
        const absolute = this.balance.totalValue - this.balance.initialBalance;
        const percent = (absolute / this.balance.initialBalance) * 100;
        return { absolute, percent };
    }

    /**
     * Reset balance to initial state
     */
    reset(): void {
        this.balance = {
            cash: this.balance.initialBalance,
            totalValue: this.balance.initialBalance,
            initialBalance: this.balance.initialBalance,
            lastUpdated: new Date(),
        };
    }

    /**
     * Serialize balance for storage
     */
    serialize(): string {
        return JSON.stringify(this.balance);
    }

    /**
     * Restore balance from serialized data
     */
    restore(data: string): void {
        try {
            const parsed = JSON.parse(data);
            this.balance = {
                ...parsed,
                lastUpdated: new Date(parsed.lastUpdated),
            };
        } catch {
            console.error('Failed to restore balance data');
        }
    }
}
