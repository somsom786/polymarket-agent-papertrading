/**
 * LLM Client for Trading Analysis
 * Supports multiple providers, chain of thought, and streaming
 */

import type { EnrichedMarket, EnrichedEvent } from '../api/types.js';
import type { LLMChainOfThought, LLMAnalysisRequest, RiskLevel, LLMThought } from './types.js';
import { scanForLLMs, getProviderForModel, type LLMProvider, type LLMModel, OllamaProvider } from './llm-providers.js';
import { v4 as uuidv4 } from 'uuid';

interface LLMResponse {
    action: 'BUY_YES' | 'BUY_NO' | 'HOLD' | 'BUY' | 'DCA' | 'SELL';
    confidence: number;
    reason: string;
    outcome?: string;
    positionSize?: number;
}

export class LLMClient {
    private provider: LLMProvider;
    private modelId: string;
    private thoughts: LLMThought[] = [];
    public onThought?: (thought: LLMThought) => void;

    constructor(provider?: LLMProvider, modelId?: string) {
        this.provider = provider || new OllamaProvider();
        this.modelId = modelId || process.env.OLLAMA_MODEL || 'llama3.1:8b';
    }

    /**
     * Set the active model
     */
    setModel(provider: LLMProvider, modelId: string): void {
        this.provider = provider;
        this.modelId = modelId;
    }

    /**
     * Get available models from all providers
     */
    async getAvailableModels(): Promise<{ provider: LLMProvider; models: LLMModel[] }[]> {
        return scanForLLMs();
    }

    /**
     * Check if any LLM is available
     */
    async isAvailable(): Promise<boolean> {
        return this.provider.isAvailable();
    }

    /**
     * Get recent thoughts
     */
    getThoughts(): LLMThought[] {
        return this.thoughts.slice(-50);
    }

    /**
     * Generate with the active model
     */
    private async generate(prompt: string): Promise<string> {
        return this.provider.generate(this.modelId, prompt);
    }

    /**
     * Parse LLM JSON response
     */
    private parseResponse(text: string): LLMResponse {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    action: parsed.action || 'HOLD',
                    confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
                    reason: parsed.reason || 'No reason provided',
                    outcome: parsed.outcome,
                    positionSize: parsed.positionSize,
                };
            } catch { }
        }
        return { action: 'HOLD', confidence: 0.3, reason: 'Failed to parse' };
    }

    /**
     * Chain of thought analysis - LLM debates with itself
     */
    async analyzeWithChainOfThought(request: LLMAnalysisRequest): Promise<LLMChainOfThought> {
        const { market, riskLevel, existingPosition, portfolioValue, cashAvailable } = request;

        const riskDescriptions: Record<number, string> = {
            1: 'VERY CONSERVATIVE - Only trade with extremely high confidence',
            2: 'CONSERVATIVE - Prefer safe, high-probability bets',
            3: 'CAUTIOUS - Balance safety with opportunity',
            4: 'MODERATE - Take reasonable calculated risks',
            5: 'BALANCED - Mix of safe and risky positions',
            6: 'AGGRESSIVE - Willing to take bigger risks for bigger rewards',
            7: 'VERY AGGRESSIVE - Maximize gains, accept higher losses',
            8: 'HIGH RISK - Go big or go home mentality',
            9: 'EXTREME RISK - Bet heavily on convictions',
            10: 'YOLO MODE - Maximum aggression, swing for the fences',
        };

        const prompt = `You are an aggressive prediction market trader. Your goal is to MAXIMIZE PROFITS.

RISK LEVEL: ${riskLevel}/10 - ${riskDescriptions[riskLevel]}
PORTFOLIO VALUE: $${portfolioValue.toFixed(2)}
CASH AVAILABLE: $${cashAvailable.toFixed(2)}
${existingPosition ? `EXISTING POSITION: ${existingPosition.shares} shares @ ${(existingPosition.avgPrice * 100).toFixed(1)}¢` : 'NO EXISTING POSITION'}

MARKET: ${market.question}
CATEGORY: ${market.category}
YES PRICE: ${(market.yesPrice * 100).toFixed(1)}¢
NO PRICE: ${(market.noPrice * 100).toFixed(1)}¢
END DATE: ${market.end_date_iso}

STEP 1 - INITIAL ANALYSIS:
Analyze this market. What is your initial gut feeling? Is this mispriced?

STEP 2 - COUNTER-ARGUMENTS:
Now argue AGAINST your initial position. What could go wrong? Why might you be wrong?

STEP 3 - FINAL VERDICT:
After considering both sides, make your final decision. Be decisive!

${riskLevel >= 7 ? 'REMEMBER: At this risk level, favor ACTION over caution. Make money!' : ''}
${existingPosition ? 'Consider: Should you DCA (add more to existing position) or hold?' : ''}

Respond in JSON format:
{
  "initialAnalysis": "your initial take...",
  "counterArguments": "why you might be wrong...",
  "finalVerdict": "your final decision...",
  "action": "BUY_YES" | "BUY_NO" | "HOLD" | "DCA" | "SELL",
  "confidence": 0.0-1.0,
  "positionSize": dollars to risk (based on confidence and risk level),
  "reasoning": ["reason 1", "reason 2", "reason 3"]
}`;

        try {
            const response = await this.generate(prompt);
            const parsed = this.parseChainOfThought(response);

            // Record this thought
            const thought: LLMThought = {
                id: uuidv4(),
                timestamp: new Date(),
                marketQuestion: market.question,
                thinking: `Initial: ${parsed.initialAnalysis}\n\nCounter: ${parsed.counterArguments}`,
                decision: parsed.finalVerdict,
                confidence: parsed.confidence,
                reasoning: parsed.reasoning,
            };

            this.thoughts.push(thought);
            if (this.thoughts.length > 100) this.thoughts.shift();
            this.onThought?.(thought);

            return parsed;
        } catch (error) {
            return {
                initialAnalysis: 'Error analyzing market',
                counterArguments: '',
                finalVerdict: 'Hold due to error',
                action: 'HOLD',
                confidence: 0,
                positionSize: 0,
                reasoning: [`Error: ${error}`],
            };
        }
    }

    /**
     * Parse chain of thought response
     */
    private parseChainOfThought(text: string): LLMChainOfThought {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    initialAnalysis: parsed.initialAnalysis || '',
                    counterArguments: parsed.counterArguments || '',
                    finalVerdict: parsed.finalVerdict || '',
                    action: parsed.action || 'HOLD',
                    confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
                    positionSize: parsed.positionSize || 100,
                    reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning : [],
                };
            } catch { }
        }
        return {
            initialAnalysis: text.slice(0, 200),
            counterArguments: '',
            finalVerdict: 'Could not parse response',
            action: 'HOLD',
            confidence: 0.3,
            positionSize: 0,
            reasoning: [],
        };
    }

    /**
     * Quick analysis for a market (simpler prompt)
     */
    async analyzeMarket(market: EnrichedMarket, riskLevel: RiskLevel = 5): Promise<LLMResponse> {
        const prompt = `Prediction market trader. Risk level: ${riskLevel}/10.
Market: ${market.question}
YES: ${(market.yesPrice * 100).toFixed(1)}¢ | NO: ${(market.noPrice * 100).toFixed(1)}¢

${riskLevel >= 7 ? 'BE AGGRESSIVE - favor action!' : 'Be calculated.'}

JSON only: {"action": "BUY_YES"|"BUY_NO"|"HOLD", "confidence": 0-1, "reason": "brief"}`;

        try {
            const response = await this.generate(prompt);
            return this.parseResponse(response);
        } catch {
            return { action: 'HOLD', confidence: 0, reason: 'LLM error' };
        }
    }

    /**
     * Analyze multi-outcome event
     */
    async analyzeEvent(event: EnrichedEvent, riskLevel: RiskLevel = 5): Promise<LLMResponse> {
        const outcomes = event.outcomes.slice(0, 8)
            .map((o, i) => `${i + 1}. ${o.name}: ${(o.price * 100).toFixed(1)}%`)
            .join('\n');

        const prompt = `Multi-outcome prediction market. Risk: ${riskLevel}/10.
Event: ${event.title}

${outcomes}

${riskLevel >= 7 ? 'Find the BEST value bet!' : 'Which outcome is undervalued?'}

JSON only: {"action": "BUY"|"HOLD", "outcome": "name", "confidence": 0-1, "reason": "brief"}`;

        try {
            const response = await this.generate(prompt);
            return this.parseResponse(response);
        } catch {
            return { action: 'HOLD', confidence: 0, reason: 'LLM error' };
        }
    }

    /**
     * Get DCA recommendation
     */
    async getDCARecommendation(
        market: EnrichedMarket,
        currentPosition: { shares: number; avgPrice: number },
        cashAvailable: number,
        riskLevel: RiskLevel
    ): Promise<{ shouldDCA: boolean; amount: number; reason: string }> {
        const currentPnL = (market.yesPrice - currentPosition.avgPrice) * currentPosition.shares;
        const pnlPercent = ((market.yesPrice / currentPosition.avgPrice) - 1) * 100;

        const prompt = `DCA (Dollar Cost Average) decision. Risk: ${riskLevel}/10.

Market: ${market.question}
Current Position: ${currentPosition.shares} shares @ ${(currentPosition.avgPrice * 100).toFixed(1)}¢
Current Price: ${(market.yesPrice * 100).toFixed(1)}¢
Unrealized P&L: $${currentPnL.toFixed(2)} (${pnlPercent.toFixed(1)}%)
Cash Available: $${cashAvailable.toFixed(2)}

Should we add to this position (DCA)?

JSON: {"shouldDCA": true/false, "amount": dollars, "reason": "brief"}`;

        try {
            const response = await this.generate(prompt);
            const match = response.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                return {
                    shouldDCA: parsed.shouldDCA || false,
                    amount: Math.min(parsed.amount || 0, cashAvailable * 0.2),
                    reason: parsed.reason || '',
                };
            }
        } catch { }

        return { shouldDCA: false, amount: 0, reason: 'Could not analyze' };
    }
}

// Singleton
let llmInstance: LLMClient | null = null;

export function getLLMClient(): LLMClient {
    if (!llmInstance) {
        llmInstance = new LLMClient();
    }
    return llmInstance;
}

export function resetLLMClient(): void {
    llmInstance = null;
}
