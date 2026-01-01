/**
 * Global State Store using Zustand
 */

import { create } from 'zustand';
import type { EnrichedMarket, EnrichedEvent } from '../api/types.js';
import type { Position, Trade, PortfolioSummary } from '../engine/types.js';
import type { AgentStatus, AgentLogEntry, StrategyType, RiskLevel, LLMThought } from '../agent/types.js';
import type { LLMModel, LLMProvider } from '../agent/llm-providers.js';

// View types - added 'thoughts' for LLM reasoning
export type ViewType = 'dashboard' | 'markets' | 'events' | 'portfolio' | 'trades' | 'agent' | 'thoughts' | 'settings';

// App state
interface AppState {
    // Navigation
    currentView: ViewType;
    setView: (view: ViewType) => void;

    // Markets (binary YES/NO)
    markets: EnrichedMarket[];
    selectedMarketIndex: number;
    isLoadingMarkets: boolean;
    setMarkets: (markets: EnrichedMarket[]) => void;
    setSelectedMarketIndex: (index: number) => void;
    setLoadingMarkets: (loading: boolean) => void;

    // Events (multi-outcome markets)
    events: EnrichedEvent[];
    selectedEventIndex: number;
    selectedOutcomeIndex: number;
    isLoadingEvents: boolean;
    setEvents: (events: EnrichedEvent[]) => void;
    setSelectedEventIndex: (index: number) => void;
    setSelectedOutcomeIndex: (index: number) => void;
    setLoadingEvents: (loading: boolean) => void;

    // Portfolio
    portfolio: PortfolioSummary | null;
    positions: Position[];
    setPortfolio: (portfolio: PortfolioSummary) => void;
    setPositions: (positions: Position[]) => void;

    // Trades
    trades: Trade[];
    setTrades: (trades: Trade[]) => void;
    addTrade: (trade: Trade) => void;

    // Agent
    agentStatus: AgentStatus | null;
    agentLogs: AgentLogEntry[];
    strategy: StrategyType;
    setAgentStatus: (status: AgentStatus) => void;
    addAgentLog: (log: AgentLogEntry) => void;
    setStrategy: (strategy: StrategyType) => void;

    // LLM State
    availableModels: { provider: LLMProvider; models: LLMModel[] }[];
    selectedModel: LLMModel | null;
    riskLevel: RiskLevel;
    llmThoughts: LLMThought[];
    isScanning: boolean;
    setAvailableModels: (models: { provider: LLMProvider; models: LLMModel[] }[]) => void;
    setSelectedModel: (model: LLMModel | null) => void;
    setRiskLevel: (level: RiskLevel) => void;
    addLLMThought: (thought: LLMThought) => void;
    setIsScanning: (scanning: boolean) => void;

    // UI State
    showHelp: boolean;
    toggleHelp: () => void;
    notification: string | null;
    setNotification: (msg: string | null) => void;
}

export const useStore = create<AppState>((set) => ({
    // Navigation
    currentView: 'dashboard',
    setView: (view) => set({ currentView: view }),

    // Markets
    markets: [],
    selectedMarketIndex: 0,
    isLoadingMarkets: false,
    setMarkets: (markets) => set({ markets }),
    setSelectedMarketIndex: (index) => set({ selectedMarketIndex: index }),
    setLoadingMarkets: (loading) => set({ isLoadingMarkets: loading }),

    // Events (multi-outcome)
    events: [],
    selectedEventIndex: 0,
    selectedOutcomeIndex: 0,
    isLoadingEvents: false,
    setEvents: (events) => set({ events }),
    setSelectedEventIndex: (index) => set({ selectedEventIndex: index, selectedOutcomeIndex: 0 }),
    setSelectedOutcomeIndex: (index) => set({ selectedOutcomeIndex: index }),
    setLoadingEvents: (loading) => set({ isLoadingEvents: loading }),

    // Portfolio
    portfolio: null,
    positions: [],
    setPortfolio: (portfolio) => set({ portfolio }),
    setPositions: (positions) => set({ positions }),

    // Trades
    trades: [],
    setTrades: (trades) => set({ trades }),
    addTrade: (trade) => set((state) => ({ trades: [trade, ...state.trades].slice(0, 100) })),

    // Agent
    agentStatus: null,
    agentLogs: [],
    strategy: 'balanced',
    setAgentStatus: (status) => set({ agentStatus: status, strategy: status.strategy }),
    addAgentLog: (log) => set((state) => ({
        agentLogs: [...state.agentLogs, log].slice(-100)
    })),
    setStrategy: (strategy) => set({ strategy }),

    // LLM State
    availableModels: [],
    selectedModel: null,
    riskLevel: 5,
    llmThoughts: [],
    isScanning: false,
    setAvailableModels: (models) => set({ availableModels: models }),
    setSelectedModel: (model) => set({ selectedModel: model }),
    setRiskLevel: (level) => set({ riskLevel: level }),
    addLLMThought: (thought) => set((state) => ({
        llmThoughts: [...state.llmThoughts, thought].slice(-50)
    })),
    setIsScanning: (scanning) => set({ isScanning: scanning }),

    // UI State
    showHelp: false,
    toggleHelp: () => set((state) => ({ showHelp: !state.showHelp })),
    notification: null,
    setNotification: (msg) => set({ notification: msg }),
}));
