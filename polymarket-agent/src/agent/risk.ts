/**
 * Risk Manager
 * Enforces position limits and risk rules
 */

import type { Position, PortfolioSummary } from '../engine/types.js';
import type { MarketAnalysis, AgentConfig } from './types.js';

export class RiskManager {
    private config: AgentConfig;

    constructor(config: AgentConfig) {
        this.config = config;
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<AgentConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Check if we can take a new position
     */
    canTakeNewPosition(
        analysis: MarketAnalysis,
        positions: Position[],
        portfolio: PortfolioSummary
    ): { allowed: boolean; reason: string } {
        // Check max positions
        if (positions.length >= this.config.maxPositions) {
            return {
                allowed: false,
                reason: `Max positions reached (${this.config.maxPositions})`,
            };
        }

        // Check if we already have a position in this market
        const existingPosition = positions.find(
            p => p.marketId === analysis.market.condition_id
        );

        if (existingPosition) {
            const currentValue = existingPosition.shares * existingPosition.currentPrice;
            if (currentValue >= this.config.maxPositionSize) {
                return {
                    allowed: false,
                    reason: `Max position size reached for this market`,
                };
            }
        }

        // Check confidence threshold
        if (analysis.confidence < this.config.minConfidence) {
            return {
                allowed: false,
                reason: `Confidence ${(analysis.confidence * 100).toFixed(1)}% below threshold ${(this.config.minConfidence * 100).toFixed(1)}%`,
            };
        }

        // Check available cash
        const estimatedCost = analysis.suggestedSize * (
            analysis.signal.includes('YES') ? analysis.market.yesPrice : analysis.market.noPrice
        );

        if (estimatedCost > portfolio.cash * 0.2) {
            // Don't use more than 20% of cash on a single trade
            return {
                allowed: false,
                reason: 'Trade too large relative to available cash',
            };
        }

        return {
            allowed: true,
            reason: 'Trade passes risk checks',
        };
    }

    /**
     * Calculate position size based on risk parameters
     */
    calculatePositionSize(
        analysis: MarketAnalysis,
        portfolio: PortfolioSummary
    ): number {
        // Kelly-esque sizing based on confidence and available capital
        const maxSizeByConfig = this.config.maxPositionSize;
        const maxSizeByCapital = portfolio.cash * 0.1; // Max 10% of cash per trade
        const suggestedSize = analysis.suggestedSize;

        // Scale by confidence
        const confidenceMultiplier = Math.pow(analysis.confidence, 2); // Quadratic scaling
        const scaledSize = suggestedSize * confidenceMultiplier;

        return Math.min(scaledSize, maxSizeByConfig, maxSizeByCapital);
    }

    /**
     * Check if we should close a position
     */
    shouldClosePosition(position: Position): { shouldClose: boolean; reason: string } {
        // Take profit at 50% gain
        const profitPercent = (position.unrealizedPnL / (position.shares * position.avgPrice)) * 100;

        if (profitPercent > 50) {
            return {
                shouldClose: true,
                reason: `Take profit: +${profitPercent.toFixed(1)}%`,
            };
        }

        // Stop loss at 30% loss
        if (profitPercent < -30) {
            return {
                shouldClose: true,
                reason: `Stop loss: ${profitPercent.toFixed(1)}%`,
            };
        }

        // Close if price is very close to 1 (near certain outcome)
        if (position.currentPrice > 0.95) {
            return {
                shouldClose: true,
                reason: 'Near-certain outcome, taking profit',
            };
        }

        // Close if price is near 0 (position likely worthless)
        if (position.currentPrice < 0.02) {
            return {
                shouldClose: true,
                reason: 'Position near worthless, cutting loss',
            };
        }

        return {
            shouldClose: false,
            reason: 'Position within risk parameters',
        };
    }

    /**
     * Get portfolio risk metrics
     */
    getPortfolioRisk(positions: Position[], portfolio: PortfolioSummary): {
        concentration: number;
        largestPosition: number;
        drawdown: number;
    } {
        const positionValues = positions.map(p => p.shares * p.currentPrice);
        const largestPosition = Math.max(0, ...positionValues);

        return {
            concentration: positions.length > 0
                ? (largestPosition / portfolio.totalValue) * 100
                : 0,
            largestPosition,
            drawdown: Math.min(0, portfolio.totalPnL),
        };
    }
}
