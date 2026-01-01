/**
 * Market Analyzer
 * Analyzes prediction markets for trading opportunities
 */

import type { EnrichedMarket } from '../api/types.js';
import type { MarketAnalysis, StrategyType } from './types.js';
import { getLLMClient } from './llm.js';

export class MarketAnalyzer {
    /**
     * Analyze a market for trading opportunities
     */
    analyze(market: EnrichedMarket, strategy: StrategyType): MarketAnalysis {
        // LLM strategy requires async - handled separately
        if (strategy === 'llm') {
            // Return placeholder - actual LLM analysis is done via analyzeLLM()
            return {
                market,
                signal: 'HOLD',
                confidence: 0,
                reason: 'Use analyzeLLM() for LLM strategy',
                suggestedSize: 0,
            };
        }

        switch (strategy) {
            case 'momentum':
                return this.analyzeMomentum(market);
            case 'contrarian':
                return this.analyzeContrarian(market);
            case 'value':
                return this.analyzeValue(market);
            case 'random':
                return this.analyzeRandom(market);
            case 'balanced':
                return this.analyzeBalanced(market);
            default:
                return this.analyzeBalanced(market);
        }
    }

    /**
     * Analyze market using LLM (async)
     */
    async analyzeLLM(market: EnrichedMarket): Promise<MarketAnalysis> {
        const llm = getLLMClient();

        try {
            const response = await llm.analyzeMarket(market);

            return {
                market,
                signal: response.action === 'BUY_YES' ? 'BUY_YES' :
                    response.action === 'BUY_NO' ? 'BUY_NO' : 'HOLD',
                confidence: response.confidence,
                reason: `🤖 LLM: ${response.reason}`,
                suggestedSize: response.confidence > 0.6 ? 200 : 100,
            };
        } catch (error) {
            return {
                market,
                signal: 'HOLD',
                confidence: 0,
                reason: `LLM error: ${error}`,
                suggestedSize: 0,
            };
        }
    }

    /**
     * Momentum Strategy: Follow the trend
     * Buy when probability is moving in a direction
     */
    private analyzeMomentum(market: EnrichedMarket): MarketAnalysis {
        const yesPrice = market.yesPrice;
        const noPrice = market.noPrice;

        // Momentum: favor the leading outcome
        if (yesPrice > 0.6) {
            return {
                market,
                signal: 'BUY_YES',
                confidence: Math.min(yesPrice, 0.9),
                reason: `Strong YES momentum (${(yesPrice * 100).toFixed(1)}%)`,
                suggestedSize: this.calculateSize(yesPrice - 0.5),
            };
        } else if (noPrice > 0.6) {
            return {
                market,
                signal: 'BUY_NO',
                confidence: Math.min(noPrice, 0.9),
                reason: `Strong NO momentum (${(noPrice * 100).toFixed(1)}%)`,
                suggestedSize: this.calculateSize(noPrice - 0.5),
            };
        }

        return {
            market,
            signal: 'HOLD',
            confidence: 0.3,
            reason: 'No clear momentum signal',
            suggestedSize: 0,
        };
    }

    /**
     * Contrarian Strategy: Buy undervalued outcomes
     * Look for mispriced markets
     */
    private analyzeContrarian(market: EnrichedMarket): MarketAnalysis {
        const yesPrice = market.yesPrice;
        const noPrice = market.noPrice;

        // Contrarian: look for extreme valuations to fade
        if (yesPrice < 0.25 && yesPrice > 0.05) {
            return {
                market,
                signal: 'BUY_YES',
                confidence: 0.6,
                reason: `Contrarian YES play - undervalued at ${(yesPrice * 100).toFixed(1)}%`,
                suggestedSize: this.calculateSize(0.25 - yesPrice),
            };
        } else if (noPrice < 0.25 && noPrice > 0.05) {
            return {
                market,
                signal: 'BUY_NO',
                confidence: 0.6,
                reason: `Contrarian NO play - undervalued at ${(noPrice * 100).toFixed(1)}%`,
                suggestedSize: this.calculateSize(0.25 - noPrice),
            };
        }

        return {
            market,
            signal: 'HOLD',
            confidence: 0.3,
            reason: 'No contrarian opportunity',
            suggestedSize: 0,
        };
    }

    /**
     * Value Strategy: Look for markets near 50/50 with potential edge
     */
    private analyzeValue(market: EnrichedMarket): MarketAnalysis {
        const yesPrice = market.yesPrice;

        // Value: look for balanced markets
        if (Math.abs(yesPrice - 0.5) < 0.15) {
            // Slight bias towards YES in uncertain markets (arbitrary rule)
            const signal = yesPrice < 0.5 ? 'BUY_YES' : 'BUY_NO';

            return {
                market,
                signal,
                confidence: 0.55,
                reason: `Value play in balanced market (${(yesPrice * 100).toFixed(1)}% YES)`,
                suggestedSize: this.calculateSize(0.1),
            };
        }

        return {
            market,
            signal: 'HOLD',
            confidence: 0.3,
            reason: 'Market not in value zone',
            suggestedSize: 0,
        };
    }

    /**
     * Random Strategy: Random trading for baseline comparison
     */
    private analyzeRandom(market: EnrichedMarket): MarketAnalysis {
        const random = Math.random();

        if (random < 0.3) {
            return {
                market,
                signal: 'BUY_YES',
                confidence: 0.5,
                reason: 'Random YES selection',
                suggestedSize: this.calculateSize(0.2),
            };
        } else if (random < 0.6) {
            return {
                market,
                signal: 'BUY_NO',
                confidence: 0.5,
                reason: 'Random NO selection',
                suggestedSize: this.calculateSize(0.2),
            };
        }

        return {
            market,
            signal: 'HOLD',
            confidence: 0.5,
            reason: 'Random hold decision',
            suggestedSize: 0,
        };
    }

    /**
     * Balanced Strategy: Combination of approaches
     */
    private analyzeBalanced(market: EnrichedMarket): MarketAnalysis {
        const yesPrice = market.yesPrice;
        const noPrice = market.noPrice;

        // Strong momentum
        if (yesPrice > 0.7) {
            return {
                market,
                signal: 'BUY_YES',
                confidence: 0.7,
                reason: `Balanced: Strong YES probability (${(yesPrice * 100).toFixed(1)}%)`,
                suggestedSize: this.calculateSize(yesPrice - 0.5),
            };
        } else if (noPrice > 0.7) {
            return {
                market,
                signal: 'BUY_NO',
                confidence: 0.7,
                reason: `Balanced: Strong NO probability (${(noPrice * 100).toFixed(1)}%)`,
                suggestedSize: this.calculateSize(noPrice - 0.5),
            };
        }

        // Contrarian opportunity
        if (yesPrice < 0.2 && yesPrice > 0.05) {
            return {
                market,
                signal: 'BUY_YES',
                confidence: 0.5,
                reason: `Balanced: Contrarian YES at ${(yesPrice * 100).toFixed(1)}%`,
                suggestedSize: this.calculateSize(0.15),
            };
        } else if (noPrice < 0.2 && noPrice > 0.05) {
            return {
                market,
                signal: 'BUY_NO',
                confidence: 0.5,
                reason: `Balanced: Contrarian NO at ${(noPrice * 100).toFixed(1)}%`,
                suggestedSize: this.calculateSize(0.15),
            };
        }

        return {
            market,
            signal: 'HOLD',
            confidence: 0.4,
            reason: 'Balanced: No clear opportunity',
            suggestedSize: 0,
        };
    }

    /**
     * Calculate suggested position size based on signal strength
     */
    private calculateSize(strength: number): number {
        // Base size of 100, scaled by strength
        const baseSize = 100;
        const scaledSize = baseSize * Math.abs(strength) * 5;
        return Math.max(10, Math.min(500, scaledSize));
    }

    /**
     * Batch analyze multiple markets
     */
    analyzeMarkets(markets: EnrichedMarket[], strategy: StrategyType): MarketAnalysis[] {
        return markets.map(m => this.analyze(m, strategy));
    }

    /**
     * Get top opportunities from analysis
     */
    getTopOpportunities(analyses: MarketAnalysis[], count: number = 5): MarketAnalysis[] {
        return analyses
            .filter(a => a.signal !== 'HOLD')
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, count);
    }
}
