/**
 * AI Agent Types
 */

import type { EnrichedMarket } from '../api/types.js';
import type { OrderRequest } from '../engine/types.js';

// Risk level (1-10 scale)
export type RiskLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

// Agent configuration
export interface AgentConfig {
    strategy: StrategyType;
    maxPositionSize: number;
    maxPositions: number;
    minConfidence: number;
    autoTrade: boolean;
    tradeIntervalMs: number;
    riskLevel: RiskLevel;
    dcaEnabled: boolean;
    selectedModel?: string;
}

// Strategy types
export type StrategyType = 'momentum' | 'contrarian' | 'value' | 'random' | 'balanced' | 'llm';

// Market analysis result
export interface MarketAnalysis {
    market: EnrichedMarket;
    signal: 'BUY_YES' | 'BUY_NO' | 'SELL_YES' | 'SELL_NO' | 'HOLD' | 'DCA';
    confidence: number; // 0-1
    reason: string;
    suggestedSize: number;
    dcaAmount?: number; // For dollar cost averaging
}

// Trading decision
export interface TradingDecision {
    action: 'EXECUTE' | 'SKIP' | 'DCA';
    order?: OrderRequest;
    reason: string;
    analysis: MarketAnalysis;
}

// Agent status
export interface AgentStatus {
    isRunning: boolean;
    strategy: StrategyType;
    lastAnalysisTime: Date | null;
    lastTradeTime: Date | null;
    marketsAnalyzed: number;
    opportunitiesFound: number;
    tradesExecuted: number;
    riskLevel: RiskLevel;
    selectedModel?: string;
}

// Agent log entry
export interface AgentLogEntry {
    timestamp: Date;
    level: 'INFO' | 'WARN' | 'ERROR' | 'TRADE' | 'THOUGHT';
    message: string;
    data?: unknown;
}

// LLM Thought - for showing AI reasoning
export interface LLMThought {
    id: string;
    timestamp: Date;
    marketQuestion: string;
    thinking: string; // Raw thinking/reasoning
    decision: string; // Final decision
    confidence: number;
    reasoning: string[]; // Bullet points of reasoning
}

// Risk parameters based on level
export interface RiskParams {
    maxPositions: number;
    positionSize: number;
    minConfidence: number;
    dcaEnabled: boolean;
    rebalanceEnabled: boolean;
    aggressiveMode: boolean;
}

/**
 * Get risk parameters for a given level
 */
export function getRiskParams(level: RiskLevel): RiskParams {
    return {
        maxPositions: 5 + level * 3,           // 8-35 positions
        positionSize: 50 + level * 50,         // $100-$550 per trade
        minConfidence: 0.7 - level * 0.05,     // 65%-20% confidence
        dcaEnabled: level >= 5,
        rebalanceEnabled: level >= 7,
        aggressiveMode: level >= 8,
    };
}

// LLM Analysis request
export interface LLMAnalysisRequest {
    market: EnrichedMarket;
    riskLevel: RiskLevel;
    existingPosition?: {
        shares: number;
        avgPrice: number;
    };
    portfolioValue: number;
    cashAvailable: number;
}

// LLM Chain of Thought response
export interface LLMChainOfThought {
    initialAnalysis: string;
    counterArguments: string;
    finalVerdict: string;
    action: 'BUY_YES' | 'BUY_NO' | 'HOLD' | 'DCA' | 'SELL';
    confidence: number;
    positionSize: number;
    reasoning: string[];
}
