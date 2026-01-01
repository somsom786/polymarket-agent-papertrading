/**
 * Main Application Component
 */

import React, { useEffect, useCallback } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { useStore, type ViewType } from './store.js';
import { NavBar } from './navbar.js';
import { Currency } from './components.js';
import {
    DashboardView,
    MarketsView,
    EventsView,
    PortfolioView,
    TradesView,
    AgentView,
    ThoughtsView,
    SettingsView,
    HelpModal,
} from './views/index.js';
import { PortfolioManager } from '../engine/portfolio.js';
import { TradingAgent } from '../agent/agent.js';
import type { StrategyType, RiskLevel } from '../agent/types.js';
import { scanForLLMs, getProviderForModel } from '../agent/llm-providers.js';
import { getLLMClient } from '../agent/llm.js';

interface AppProps {
    portfolio: PortfolioManager;
    agent: TradingAgent;
}

export const App: React.FC<AppProps> = ({ portfolio, agent }) => {
    const { exit } = useApp();
    const {
        currentView,
        setView,
        showHelp,
        toggleHelp,
        markets,
        selectedMarketIndex,
        setMarkets,
        setSelectedMarketIndex,
        setLoadingMarkets,
        events,
        selectedEventIndex,
        selectedOutcomeIndex,
        setEvents,
        setSelectedEventIndex,
        setSelectedOutcomeIndex,
        setLoadingEvents,
        setPortfolio,
        setPositions,
        setTrades,
        setAgentStatus,
        addAgentLog,
        setStrategy,
        setNotification,
        notification,
        riskLevel,
        setRiskLevel,
        availableModels,
        setAvailableModels,
        selectedModel,
        setSelectedModel,
        setIsScanning,
        addLLMThought,
    } = useStore();

    // Initialize and sync state
    useEffect(() => {
        // Sync portfolio state
        const syncPortfolio = () => {
            setPortfolio(portfolio.getSummary());
            setPositions(portfolio.getPositions());
            setTrades(portfolio.getRecentTrades(100));
        };

        // Set up agent callbacks
        agent.onStatusChange = (status) => {
            setAgentStatus(status);
        };

        agent.onLog = (log) => {
            addAgentLog(log);
        };

        agent.onTrade = () => {
            syncPortfolio();
        };

        // Set up LLM thought callback
        const llm = getLLMClient();
        llm.onThought = (thought) => {
            addLLMThought(thought);
            addAgentLog({
                timestamp: new Date(),
                level: 'THOUGHT',
                message: `🧠 ${thought.decision.slice(0, 60)}...`,
            });
        };

        // Initial sync
        setAgentStatus(agent.getStatus());
        syncPortfolio();

        // Set up periodic sync
        const interval = setInterval(syncPortfolio, 1000);
        return () => clearInterval(interval);
    }, [portfolio, agent]);

    // Scan for local LLMs
    const scanLLMs = useCallback(async () => {
        setIsScanning(true);
        setNotification('🔍 Scanning for local LLMs...');

        try {
            const providers = await scanForLLMs();
            setAvailableModels(providers);

            const totalModels = providers.reduce((sum, p) => sum + p.models.length, 0);
            if (totalModels > 0) {
                setNotification(`✅ Found ${totalModels} model(s) from ${providers.length} provider(s)`);
                // Auto-select first model
                if (!selectedModel && providers[0]?.models[0]) {
                    const model = providers[0].models[0];
                    const provider = providers[0].provider;
                    setSelectedModel(model);
                    getLLMClient().setModel(provider, model.id);
                }
            } else {
                setNotification('❌ No LLMs found. Start Ollama or LM Studio first.');
            }
        } catch (error) {
            setNotification(`Error scanning: ${error}`);
        } finally {
            setIsScanning(false);
        }
    }, [selectedModel]);

    // Refresh markets (binary)
    const refreshMarkets = useCallback(async () => {
        setLoadingMarkets(true);
        try {
            const enriched = await agent.refreshMarkets();
            // Sort by volume descending - high volume markets are more interesting
            const sorted = enriched.sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0));
            setMarkets(sorted);
        } catch (error) {
            setNotification(`Failed to load markets: ${error}`);
        } finally {
            setLoadingMarkets(false);
        }
    }, [agent]);

    // Refresh events (multi-outcome)
    const refreshEvents = useCallback(async () => {
        setLoadingEvents(true);
        try {
            const enrichedEvents = await agent.refreshEvents();
            setEvents(enrichedEvents);
        } catch (error) {
            setNotification(`Failed to load events: ${error}`);
        } finally {
            setLoadingEvents(false);
        }
    }, [agent]);

    // Execute a paper trade on binary market
    const executeTrade = useCallback((outcome: 'YES' | 'NO') => {
        const market = markets[selectedMarketIndex];
        if (!market) {
            setNotification('No market selected');
            return;
        }

        const token = market.tokens.find(t =>
            t.outcome.toLowerCase() === outcome.toLowerCase()
        );
        if (!token) {
            setNotification('Token not found');
            return;
        }

        const price = outcome === 'YES' ? market.yesPrice : market.noPrice;
        const shares = Math.floor(100 / price);

        const executor = portfolio.getTradeExecutor();
        const result = executor.execute({
            marketId: market.condition_id,
            marketQuestion: market.question,
            tokenId: token.token_id,
            outcome,
            side: 'BUY',
            shares,
            price,
        });

        if (result.success) {
            setNotification(`✅ Bought ${shares} ${outcome} @ ${(price * 100).toFixed(1)}¢`);
            setTrades(portfolio.getRecentTrades(100));
            setPositions(portfolio.getPositions());
            setPortfolio(portfolio.getSummary());
        } else {
            setNotification(result.error || 'Trade failed');
        }
    }, [markets, selectedMarketIndex, portfolio]);

    // Execute a paper trade on multi-outcome event
    const executeEventTrade = useCallback(() => {
        const multiEvents = events.filter(e => e.isMultiOutcome && e.outcomeCount > 2);
        const event = multiEvents[selectedEventIndex];
        if (!event) {
            setNotification('No event selected');
            return;
        }

        const outcome = event.outcomes[selectedOutcomeIndex];
        if (!outcome) {
            setNotification('No outcome selected');
            return;
        }

        const price = outcome.price;
        const shares = Math.floor(100 / price);

        const executor = portfolio.getTradeExecutor();
        const result = executor.execute({
            marketId: event.id,
            marketQuestion: `${event.title}: ${outcome.name}`,
            tokenId: outcome.tokenId,
            outcome: outcome.name,
            side: 'BUY',
            shares,
            price,
        });

        if (result.success) {
            setNotification(`✅ Bought ${shares} "${outcome.name}" @ ${(price * 100).toFixed(1)}¢`);
            setTrades(portfolio.getRecentTrades(100));
            setPositions(portfolio.getPositions());
            setPortfolio(portfolio.getSummary());
        } else {
            setNotification(result.error || 'Trade failed');
        }
    }, [events, selectedEventIndex, selectedOutcomeIndex, portfolio]);

    // Handle keyboard input
    useInput((input, key) => {
        // Clear notification on any key
        if (notification) {
            setNotification(null);
        }

        // Global shortcuts
        if (input === 'q' || input === 'Q') {
            agent.stop();
            exit();
            return;
        }

        if (input === 'h' || input === 'H') {
            toggleHelp();
            return;
        }

        // Risk level adjustment (+ / -)
        if (input === '+' || input === '=') {
            const newLevel = Math.min(10, riskLevel + 1) as RiskLevel;
            setRiskLevel(newLevel);
            agent.updateConfig({ riskLevel: newLevel });
            setNotification(`⚠️ Risk Level: ${newLevel}/10`);
            return;
        }
        if (input === '-' || input === '_') {
            const newLevel = Math.max(1, riskLevel - 1) as RiskLevel;
            setRiskLevel(newLevel);
            agent.updateConfig({ riskLevel: newLevel });
            setNotification(`🛡️ Risk Level: ${newLevel}/10`);
            return;
        }

        // View order for arrow navigation
        const viewOrder: ViewType[] = ['dashboard', 'markets', 'events', 'portfolio', 'trades', 'agent', 'thoughts', 'settings'];
        const currentIndex = viewOrder.indexOf(currentView);

        // === VIEW-SPECIFIC SHORTCUTS (PROCESSED FIRST) ===

        // Agent view controls - MUST be before global navigation for 0-9 keys
        if (currentView === 'agent') {
            // Model selection (0-9) - only consume key if a model exists at that index
            const modelIndex = parseInt(input);
            if (!isNaN(modelIndex) && modelIndex >= 0 && modelIndex <= 9) {
                const flatModels = availableModels.flatMap(p => p.models);
                const model = flatModels[modelIndex];
                if (model) {
                    const provider = getProviderForModel(model.id, availableModels);
                    if (provider) {
                        setSelectedModel(model);
                        getLLMClient().setModel(provider, model.id);
                        setNotification(`✅ Selected: ${model.name} (${model.provider})`);
                        return; // Only consume the key if we actually selected a model
                    }
                }
                // If no model at this index, fall through to global navigation
            }

            if (input === 'a' || input === 'A') {
                agent.toggle();
                return;
            } else if (input === 't' || input === 'T') {
                const config = agent.getConfig();
                agent.updateConfig({ autoTrade: !config.autoTrade });
                setNotification(`Auto-trade ${config.autoTrade ? 'disabled' : 'enabled'}`);
                return;
            } else if (input === 's' || input === 'S') {
                scanLLMs();
                return;
            }

            // Strategy selection
            const strategyMap: Record<string, StrategyType> = {
                'm': 'momentum',
                'c': 'contrarian',
                'v': 'value',
                'l': 'balanced',
                'r': 'random',
                'i': 'llm',
            };

            if (strategyMap[input.toLowerCase()]) {
                const newStrategy = strategyMap[input.toLowerCase()];
                agent.setStrategy(newStrategy);
                setStrategy(newStrategy);
                if (newStrategy === 'llm') {
                    setNotification('🤖 LLM Strategy: AI-powered trading active');
                    if (!selectedModel) {
                        scanLLMs();
                    }
                } else {
                    setNotification(`Strategy: ${newStrategy}`);
                }
                return;
            }

            // Arrow navigation between views on agent page
            if (key.leftArrow && currentIndex > 0) {
                setView(viewOrder[currentIndex - 1]);
                return;
            } else if (key.rightArrow && currentIndex < viewOrder.length - 1) {
                setView(viewOrder[currentIndex + 1]);
                return;
            }
        }

        // Markets view
        if (currentView === 'markets') {
            // Page navigation
            if (input === 'p' || input === 'P' || key.pageUp) {
                setSelectedMarketIndex(Math.max(0, selectedMarketIndex - 15));
                return;
            } else if (input === 'n' && key.ctrl || key.pageDown) {
                setSelectedMarketIndex(Math.min(markets.length - 1, selectedMarketIndex + 15));
                return;
            }
            if (key.upArrow) {
                setSelectedMarketIndex(Math.max(0, selectedMarketIndex - 1));
                return;
            } else if (key.downArrow) {
                setSelectedMarketIndex(Math.min(markets.length - 1, selectedMarketIndex + 1));
                return;
            } else if (key.leftArrow && currentIndex > 0) {
                setView(viewOrder[currentIndex - 1]);
                return;
            } else if (key.rightArrow && currentIndex < viewOrder.length - 1) {
                setView(viewOrder[currentIndex + 1]);
                return;
            } else if (input === 'r' || input === 'R') {
                refreshMarkets();
                return;
            } else if (input === 'b' || input === 'B') {
                executeTrade('YES');
                return;
            } else if (input === 'n' || input === 'N') {
                executeTrade('NO');
                return;
            }
        }

        // Events view navigation
        if (currentView === 'events') {
            const multiEvents = events.filter(e => e.isMultiOutcome && e.outcomeCount > 2);
            const currentEvent = multiEvents[selectedEventIndex];
            const outcomeCount = currentEvent?.outcomes?.length || 0;

            if (key.upArrow) {
                setSelectedEventIndex(Math.max(0, selectedEventIndex - 1));
                return;
            } else if (key.downArrow) {
                setSelectedEventIndex(Math.min(multiEvents.length - 1, selectedEventIndex + 1));
                return;
            } else if (input === 'r' || input === 'R') {
                refreshEvents();
                return;
            } else if (input === 'b' || input === 'B') {
                executeEventTrade();
                return;
            }
            // Note: left/right arrows are used for outcome selection in events view
            if (key.leftArrow) {
                setSelectedOutcomeIndex(Math.max(0, selectedOutcomeIndex - 1));
                return;
            } else if (key.rightArrow) {
                setSelectedOutcomeIndex(Math.min(Math.min(9, outcomeCount - 1), selectedOutcomeIndex + 1));
                return;
            }
        }

        // Portfolio view
        if (currentView === 'portfolio') {
            if (input === 'x' || input === 'X') {
                portfolio.reset();
                setPortfolio(portfolio.getSummary());
                setPositions(portfolio.getPositions());
                setTrades([]);
                setNotification('Portfolio reset to $100,000');
                return;
            }
            // Arrow navigation
            if (key.leftArrow && currentIndex > 0) {
                setView(viewOrder[currentIndex - 1]);
                return;
            } else if (key.rightArrow && currentIndex < viewOrder.length - 1) {
                setView(viewOrder[currentIndex + 1]);
                return;
            }
        }

        // Dashboard, Trades, Thoughts, Settings - only arrow navigation
        if (['dashboard', 'trades', 'thoughts', 'settings'].includes(currentView)) {
            if (key.leftArrow && currentIndex > 0) {
                setView(viewOrder[currentIndex - 1]);
                return;
            } else if (key.rightArrow && currentIndex < viewOrder.length - 1) {
                setView(viewOrder[currentIndex + 1]);
                return;
            }
        }

        // === GLOBAL NAVIGATION (NUMBER KEYS) ===
        // Only process if not consumed by view-specific handlers above
        const viewMap: Record<string, ViewType> = {
            '1': 'dashboard',
            '2': 'markets',
            '3': 'events',
            '4': 'portfolio',
            '5': 'trades',
            '6': 'agent',
            '7': 'thoughts',
            '8': 'settings',
        };

        if (viewMap[input]) {
            setView(viewMap[input]);
            return;
        }
    });

    // Load data on first render
    useEffect(() => {
        if (markets.length === 0) {
            refreshMarkets();
        }
        if (events.length === 0) {
            refreshEvents();
        }
        // Auto-scan for LLMs
        scanLLMs();
    }, []);

    // Render current view
    const renderView = () => {
        switch (currentView) {
            case 'dashboard':
                return <DashboardView />;
            case 'markets':
                return <MarketsView />;
            case 'events':
                return <EventsView />;
            case 'portfolio':
                return <PortfolioView />;
            case 'trades':
                return <TradesView />;
            case 'agent':
                return <AgentView />;
            case 'thoughts':
                return <ThoughtsView />;
            case 'settings':
                return <SettingsView />;
            default:
                return <DashboardView />;
        }
    };

    const summary = portfolio.getSummary();

    return (
        <Box flexDirection="column" width="100%">
            {/* Header */}
            <Box
                paddingX={1}
                justifyContent="space-between"
                borderStyle="single"
                borderColor="cyan"
            >
                <Text bold color="cyan">
                    📊 POLYMARKET AI TRADER
                </Text>
                <Box>
                    <Text dimColor>Balance: </Text>
                    <Currency value={summary.totalValue} />
                    <Text dimColor> │ P&L: </Text>
                    <Currency value={summary.totalPnL} showSign />
                    <Text dimColor> │ Risk: </Text>
                    <Text color={riskLevel >= 7 ? 'red' : riskLevel >= 4 ? 'yellow' : 'green'} bold>
                        {riskLevel}/10
                    </Text>
                </Box>
            </Box>

            {/* Navigation */}
            <Box borderStyle="single" borderColor="gray" borderTop={false}>
                <NavBar currentView={currentView} />
            </Box>

            {/* Main Content */}
            <Box flexGrow={1} minHeight={20}>
                {showHelp ? <HelpModal /> : renderView()}
            </Box>

            {/* Notification */}
            {notification && (
                <Box paddingX={1} backgroundColor="blue">
                    <Text color="white">{notification}</Text>
                </Box>
            )}

            {/* Footer */}
            <Box paddingX={1} borderStyle="single" borderColor="gray">
                <Text dimColor>
                    <Text color="yellow">[H]</Text> Help │
                    <Text color="yellow"> ←/→</Text> Views │
                    <Text color="yellow"> ↑/↓</Text> Navigate │
                    <Text color="yellow"> 1-8</Text> Jump │
                    <Text color="yellow"> +/-</Text> Risk │
                    <Text color="red"> Q</Text> Quit
                </Text>
            </Box>
        </Box>
    );
};
