/**
 * Trading Agent Controller
 * Main orchestrator for the AI trading agent
 */

import { PolymarketClient } from '../api/client.js';
import type { EnrichedMarket, EnrichedEvent } from '../api/types.js';
import { PortfolioManager } from '../engine/portfolio.js';
import type { OrderRequest } from '../engine/types.js';
import { MarketAnalyzer } from './analyzer.js';
import { RiskManager } from './risk.js';
import type {
    AgentConfig,
    AgentStatus,
    AgentLogEntry,
    TradingDecision,
    MarketAnalysis,
    StrategyType,
} from './types.js';

const DEFAULT_CONFIG: AgentConfig = {
    strategy: 'balanced',
    maxPositionSize: 10000,
    maxPositions: 10,
    minConfidence: 0.5,
    autoTrade: false,
    tradeIntervalMs: 60000,
    riskLevel: 5,
    dcaEnabled: false,
};

export class TradingAgent {
    private config: AgentConfig;
    private client: PolymarketClient;
    private portfolio: PortfolioManager;
    private analyzer: MarketAnalyzer;
    private riskManager: RiskManager;
    private status: AgentStatus;
    private logs: AgentLogEntry[] = [];
    private intervalId: NodeJS.Timeout | null = null;
    private markets: EnrichedMarket[] = [];
    private events: EnrichedEvent[] = [];

    // Event callbacks
    public onLog?: (entry: AgentLogEntry) => void;
    public onTrade?: (decision: TradingDecision) => void;
    public onStatusChange?: (status: AgentStatus) => void;


    constructor(portfolio: PortfolioManager, config?: Partial<AgentConfig>) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.client = new PolymarketClient();
        this.portfolio = portfolio;
        this.analyzer = new MarketAnalyzer();
        this.riskManager = new RiskManager(this.config);

        this.status = {
            isRunning: false,
            strategy: this.config.strategy,
            lastAnalysisTime: null,
            lastTradeTime: null,
            marketsAnalyzed: 0,
            opportunitiesFound: 0,
            tradesExecuted: 0,
            riskLevel: this.config.riskLevel,
        };
    }

    /**
     * Log a message
     */
    private log(level: AgentLogEntry['level'], message: string, data?: unknown): void {
        const entry: AgentLogEntry = {
            timestamp: new Date(),
            level,
            message,
            data,
        };

        this.logs.push(entry);

        // Keep only last 100 logs
        if (this.logs.length > 100) {
            this.logs = this.logs.slice(-100);
        }

        this.onLog?.(entry);
    }

    /**
     * Get recent logs
     */
    getLogs(count: number = 20): AgentLogEntry[] {
        return this.logs.slice(-count);
    }

    /**
     * Get agent status
     */
    getStatus(): AgentStatus {
        return { ...this.status };
    }

    /**
     * Get current config
     */
    getConfig(): AgentConfig {
        return { ...this.config };
    }

    /**
     * Update configuration
     */
    updateConfig(config: Partial<AgentConfig>): void {
        this.config = { ...this.config, ...config };
        this.status.strategy = this.config.strategy;
        this.riskManager.updateConfig(this.config);
        this.onStatusChange?.(this.status);

        this.log('INFO', `Configuration updated`, config);
    }

    /**
     * Set trading strategy
     */
    setStrategy(strategy: StrategyType): void {
        this.config.strategy = strategy;
        this.status.strategy = strategy;
        this.riskManager.updateConfig({ strategy });
        this.onStatusChange?.(this.status);

        this.log('INFO', `Strategy changed to: ${strategy}`);
    }

    /**
     * Fetch and cache markets
     */
    async refreshMarkets(): Promise<EnrichedMarket[]> {
        try {
            this.log('INFO', 'Fetching markets from Polymarket...');

            // Use getEnrichedMarketsFromGamma for proper price data
            // Fetch all available markets (pagination handles up to 500)
            this.markets = await this.client.getEnrichedMarketsFromGamma(500);

            this.log('INFO', `Fetched ${this.markets.length} active markets with prices`);

            return this.markets;
        } catch (error) {
            this.log('ERROR', `Failed to fetch markets: ${error}`);
            throw error;
        }
    }

    /**
     * Fetch and cache events (multi-outcome markets)
     */
    async refreshEvents(): Promise<EnrichedEvent[]> {
        try {
            this.log('INFO', 'Fetching multi-outcome events from Polymarket...');

            this.events = await this.client.getEnrichedEvents(100);
            const multiOutcome = this.events.filter(e => e.isMultiOutcome && e.outcomeCount > 2);

            this.log('INFO', `Fetched ${this.events.length} events (${multiOutcome.length} multi-outcome)`);

            return this.events;
        } catch (error) {
            this.log('ERROR', `Failed to fetch events: ${error}`);
            throw error;
        }
    }

    /**
     * Get cached markets
     */
    getMarkets(): EnrichedMarket[] {
        return this.markets;
    }

    /**
     * Get cached events
     */
    getEvents(): EnrichedEvent[] {
        return this.events;
    }


    /**
     * Run a single analysis cycle
     */
    async analyzeMarkets(): Promise<MarketAnalysis[]> {
        if (this.markets.length === 0) {
            await this.refreshMarkets();
        }

        this.log('INFO', `Analyzing ${this.markets.length} markets with ${this.config.strategy} strategy`);

        let opportunities: MarketAnalysis[];

        if (this.config.strategy === 'llm') {
            // For LLM strategy, pre-filter to most interesting markets and analyze with LLM
            // Sort by how close to 50/50 (most uncertain = most interesting)
            const sortedMarkets = [...this.markets]
                .filter(m => m.yesPrice > 0.1 && m.yesPrice < 0.9) // Filter extreme prices
                .sort((a, b) => Math.abs(a.yesPrice - 0.5) - Math.abs(b.yesPrice - 0.5))
                .slice(0, 10); // Only analyze top 10 most uncertain markets

            this.log('INFO', `Using LLM to analyze ${sortedMarkets.length} promising markets...`);

            const llmAnalyses: MarketAnalysis[] = [];
            for (const market of sortedMarkets.slice(0, 5)) { // Limit to 5 to avoid timeout
                try {
                    const analysis = await this.analyzer.analyzeLLM(market);
                    if (analysis.signal !== 'HOLD') {
                        llmAnalyses.push(analysis);
                    }
                } catch (error) {
                    this.log('WARN', `LLM analysis failed for market: ${error}`);
                }
            }
            opportunities = llmAnalyses;
        } else {
            // Use regular strategy-based analysis
            const analyses = this.analyzer.analyzeMarkets(this.markets, this.config.strategy);
            opportunities = this.analyzer.getTopOpportunities(analyses, 10);
        }

        this.status.lastAnalysisTime = new Date();
        this.status.marketsAnalyzed = this.markets.length;
        this.status.opportunitiesFound = opportunities.length;
        this.onStatusChange?.(this.status);

        this.log('INFO', `Found ${opportunities.length} trading opportunities`);

        return opportunities;
    }

    /**
     * Make a trading decision for an opportunity
     */
    makeDecision(analysis: MarketAnalysis): TradingDecision {
        const positions = this.portfolio.getPositions();
        const summary = this.portfolio.getSummary();

        // Check risk rules
        const riskCheck = this.riskManager.canTakeNewPosition(analysis, positions, summary);

        if (!riskCheck.allowed) {
            return {
                action: 'SKIP',
                reason: riskCheck.reason,
                analysis,
            };
        }

        // Calculate position size
        const size = this.riskManager.calculatePositionSize(analysis, summary);

        if (size < 10) {
            return {
                action: 'SKIP',
                reason: 'Position size too small',
                analysis,
            };
        }

        // Build order
        const isYes = analysis.signal.includes('YES');
        const token = analysis.market.tokens.find(t =>
            t.outcome.toLowerCase() === (isYes ? 'yes' : 'no')
        );

        if (!token) {
            return {
                action: 'SKIP',
                reason: 'Could not find token for outcome',
                analysis,
            };
        }

        const order: OrderRequest = {
            marketId: analysis.market.condition_id,
            marketQuestion: analysis.market.question,
            tokenId: token.token_id,
            outcome: isYes ? 'YES' : 'NO',
            side: 'BUY',
            shares: Math.floor(size / (isYes ? analysis.market.yesPrice : analysis.market.noPrice)),
            price: isYes ? analysis.market.yesPrice : analysis.market.noPrice,
        };

        return {
            action: 'EXECUTE',
            order,
            reason: analysis.reason,
            analysis,
        };
    }

    /**
     * Execute a trading decision
     */
    executeTrade(decision: TradingDecision): boolean {
        if (decision.action !== 'EXECUTE' || !decision.order) {
            return false;
        }

        const executor = this.portfolio.getTradeExecutor();
        const result = executor.execute(decision.order);

        if (result.success) {
            this.status.tradesExecuted++;
            this.status.lastTradeTime = new Date();
            this.onStatusChange?.(this.status);

            this.log('TRADE',
                `${decision.order.side} ${decision.order.shares} ${decision.order.outcome} @ $${decision.order.price.toFixed(4)}`,
                { order: decision.order, result }
            );

            this.onTrade?.(decision);
            return true;
        } else {
            this.log('ERROR', `Trade failed: ${result.error}`);
            return false;
        }
    }

    /**
     * Check positions for exit opportunities
     */
    async checkExits(): Promise<void> {
        const positions = this.portfolio.getPositions();

        for (const position of positions) {
            const exitCheck = this.riskManager.shouldClosePosition(position);

            if (exitCheck.shouldClose) {
                this.log('INFO', `Exit signal for ${position.outcome}: ${exitCheck.reason}`);

                if (this.config.autoTrade) {
                    const order: OrderRequest = {
                        marketId: position.marketId,
                        marketQuestion: position.marketQuestion,
                        tokenId: position.tokenId,
                        outcome: position.outcome,
                        side: 'SELL',
                        shares: position.shares,
                        price: position.currentPrice,
                    };

                    const executor = this.portfolio.getTradeExecutor();
                    const result = executor.execute(order);

                    if (result.success) {
                        this.log('TRADE', `Closed position: ${exitCheck.reason}`, result);
                    }
                }
            }
        }
    }

    /**
     * Run one complete trading cycle
     */
    async runCycle(): Promise<void> {
        try {
            // Refresh market data
            await this.refreshMarkets();

            // Update position prices
            const tokenIds = this.portfolio.getPositions().map(p => p.tokenId);
            if (tokenIds.length > 0) {
                const prices = await this.client.getPrices(tokenIds);
                this.portfolio.updatePrices(prices);
            }

            // Check for exit opportunities
            await this.checkExits();

            // Analyze markets for new opportunities
            const opportunities = await this.analyzeMarkets();

            // Make and execute decisions
            for (const opp of opportunities) {
                const decision = this.makeDecision(opp);

                if (decision.action === 'EXECUTE' && this.config.autoTrade) {
                    this.executeTrade(decision);

                    // Only take one trade per cycle
                    break;
                }
            }
        } catch (error) {
            this.log('ERROR', `Trading cycle failed: ${error}`);
        }
    }

    /**
     * Start the agent (auto-trading mode)
     */
    start(): void {
        if (this.status.isRunning) {
            this.log('WARN', 'Agent is already running');
            return;
        }

        this.status.isRunning = true;
        this.onStatusChange?.(this.status);

        this.log('INFO', `Agent started with ${this.config.strategy} strategy`);

        // Run immediately
        this.runCycle();

        // Set up interval
        this.intervalId = setInterval(() => {
            this.runCycle();
        }, this.config.tradeIntervalMs);
    }

    /**
     * Stop the agent
     */
    stop(): void {
        if (!this.status.isRunning) {
            return;
        }

        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        this.status.isRunning = false;
        this.onStatusChange?.(this.status);

        this.log('INFO', 'Agent stopped');
    }

    /**
     * Toggle agent running state
     */
    toggle(): void {
        if (this.status.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    }
}
