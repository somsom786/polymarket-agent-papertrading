/**
 * Agent View - AI agent control, model selection, and monitoring
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Panel, StatusIndicator, formatTime, EmptyState, truncate } from '../components.js';
import { useStore } from '../store.js';
import type { StrategyType, RiskLevel } from '../../agent/types.js';

// Strategies with letter shortcuts
const strategies: { key: string; value: StrategyType; description: string }[] = [
    { key: 'M', value: 'momentum', description: 'Follow trends' },
    { key: 'C', value: 'contrarian', description: 'Buy undervalued' },
    { key: 'V', value: 'value', description: 'Near 50/50 markets' },
    { key: 'L', value: 'balanced', description: 'Mix of strategies' },
    { key: 'R', value: 'random', description: 'Random baseline' },
    { key: 'I', value: 'llm', description: '🤖 AI-powered trading' },
];

// Risk level descriptions
const riskDescriptions: Record<number, { label: string; emoji: string; color: string }> = {
    1: { label: 'Ultra Safe', emoji: '🛡️', color: 'green' },
    2: { label: 'Very Safe', emoji: '🛡️', color: 'green' },
    3: { label: 'Conservative', emoji: '🔒', color: 'green' },
    4: { label: 'Cautious', emoji: '⚖️', color: 'yellow' },
    5: { label: 'Balanced', emoji: '⚡', color: 'yellow' },
    6: { label: 'Moderate Risk', emoji: '⚡', color: 'yellow' },
    7: { label: 'Aggressive', emoji: '🔥', color: 'red' },
    8: { label: 'Very Aggressive', emoji: '🔥', color: 'red' },
    9: { label: 'Extreme', emoji: '💀', color: 'red' },
    10: { label: 'YOLO MODE', emoji: '🚀', color: 'magenta' },
};

export const AgentView: React.FC = () => {
    const {
        agentStatus,
        agentLogs,
        strategy,
        availableModels,
        selectedModel,
        riskLevel,
        isScanning,
    } = useStore();

    const status = agentStatus || {
        isRunning: false,
        strategy: 'balanced' as StrategyType,
        lastAnalysisTime: null,
        lastTradeTime: null,
        marketsAnalyzed: 0,
        opportunitiesFound: 0,
        tradesExecuted: 0,
        riskLevel: 5 as RiskLevel,
    };

    const riskInfo = riskDescriptions[riskLevel] || riskDescriptions[5];
    const flatModels = availableModels.flatMap(p => p.models);

    return (
        <Box flexDirection="column" padding={1}>
            {/* Top Row - Control & Stats */}
            <Box>
                <Box width="50%" marginRight={1}>
                    <Panel title="🤖 Agent Control" borderColor={status.isRunning ? 'green' : 'gray'}>
                        <Box flexDirection="column">
                            <Box justifyContent="space-between">
                                <StatusIndicator
                                    active={status.isRunning}
                                    activeLabel="Running"
                                    inactiveLabel="Stopped"
                                />
                                <Text>
                                    <Text color="yellow">[A]</Text> {status.isRunning ? 'Stop' : 'Start'}
                                </Text>
                            </Box>
                            <Box marginTop={1}>
                                <Box width="50%">
                                    <Text dimColor>Last Analysis: </Text>
                                    <Text>{status.lastAnalysisTime ? formatTime(status.lastAnalysisTime) : 'Never'}</Text>
                                </Box>
                                <Box width="50%">
                                    <Text dimColor>Last Trade: </Text>
                                    <Text>{status.lastTradeTime ? formatTime(status.lastTradeTime) : 'Never'}</Text>
                                </Box>
                            </Box>
                        </Box>
                    </Panel>
                </Box>

                <Box width="50%">
                    <Panel title="📊 Stats" borderColor="cyan">
                        <Box justifyContent="space-between">
                            <Box flexDirection="column">
                                <Text dimColor>Markets</Text>
                                <Text bold color="cyan">{status.marketsAnalyzed}</Text>
                            </Box>
                            <Box flexDirection="column">
                                <Text dimColor>Opportunities</Text>
                                <Text bold color="yellow">{status.opportunitiesFound}</Text>
                            </Box>
                            <Box flexDirection="column">
                                <Text dimColor>Trades</Text>
                                <Text bold color="green">{status.tradesExecuted}</Text>
                            </Box>
                        </Box>
                    </Panel>
                </Box>
            </Box>

            {/* Risk Level */}
            <Box marginTop={1}>
                <Panel title={`⚠️ Risk Level: ${riskLevel}/10 ${riskInfo.emoji}`} borderColor={riskInfo.color}>
                    <Box justifyContent="space-between">
                        <Box>
                            <Text color={riskInfo.color} bold>{riskInfo.label}</Text>
                            <Text dimColor> │ </Text>
                            <Text dimColor>Max Positions: </Text>
                            <Text>{5 + riskLevel * 3}</Text>
                            <Text dimColor> │ Trade Size: </Text>
                            <Text>${50 + riskLevel * 50}</Text>
                            <Text dimColor> │ Min Confidence: </Text>
                            <Text>{((0.7 - riskLevel * 0.05) * 100).toFixed(0)}%</Text>
                        </Box>
                        <Text>
                            <Text color="yellow">[+/-]</Text> Adjust
                        </Text>
                    </Box>
                </Panel>
            </Box>

            {/* Model Selection */}
            <Box marginTop={1}>
                <Panel title="🧠 LLM Model" borderColor="magenta">
                    <Box flexDirection="column">
                        {isScanning ? (
                            <Text color="yellow">Scanning for local LLMs...</Text>
                        ) : flatModels.length === 0 ? (
                            <Box>
                                <Text dimColor>No LLMs found. </Text>
                                <Text color="yellow">[S]</Text>
                                <Text dimColor> to scan │ Start Ollama/LM Studio first</Text>
                            </Box>
                        ) : (
                            <Box flexDirection="column">
                                <Box marginBottom={1}>
                                    <Text dimColor>Found {flatModels.length} model(s). Press </Text>
                                    <Text color="yellow">[0-9]</Text>
                                    <Text dimColor> to select:</Text>
                                </Box>
                                {flatModels.slice(0, 5).map((model, i) => (
                                    <Box key={model.id}>
                                        <Text color="yellow">[{i}]</Text>
                                        <Text
                                            color={selectedModel?.id === model.id ? 'cyan' : undefined}
                                            bold={selectedModel?.id === model.id}
                                        >
                                            {selectedModel?.id === model.id ? ' ● ' : ' ○ '}
                                            {truncate(model.name, 20)}
                                        </Text>
                                        <Text dimColor> ({model.provider})</Text>
                                        {model.size && <Text dimColor> {model.size}</Text>}
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </Box>
                </Panel>
            </Box>

            {/* Strategy Selection */}
            <Box marginTop={1}>
                <Panel title="🎯 Strategy" borderColor="yellow">
                    <Box>
                        {strategies.map((s) => (
                            <Box key={s.value} marginRight={2}>
                                <Text color="yellow">[{s.key}]</Text>
                                <Text
                                    color={strategy === s.value ? 'cyan' : 'white'}
                                    bold={strategy === s.value}
                                >
                                    {strategy === s.value ? ' ●' : ' ○'} {s.value}
                                </Text>
                            </Box>
                        ))}
                    </Box>
                </Panel>
            </Box>

            {/* Logs */}
            <Box marginTop={1}>
                <Panel title="📋 Logs" borderColor="gray">
                    {agentLogs.length === 0 ? (
                        <EmptyState message="No activity. Press [A] to start." />
                    ) : (
                        <Box flexDirection="column" height={6}>
                            {agentLogs.slice(-6).map((log, i) => (
                                <Box key={i}>
                                    <Text dimColor>[{formatTime(log.timestamp)}]</Text>
                                    <Text
                                        color={
                                            log.level === 'ERROR' ? 'red' :
                                                log.level === 'WARN' ? 'yellow' :
                                                    log.level === 'TRADE' ? 'green' :
                                                        log.level === 'THOUGHT' ? 'magenta' : 'white'
                                        }
                                    >
                                        {' '}[{log.level}]
                                    </Text>
                                    <Text> {truncate(log.message, 50)}</Text>
                                </Box>
                            ))}
                        </Box>
                    )}
                </Panel>
            </Box>

            {/* Controls */}
            <Box marginTop={1} paddingX={1}>
                <Text dimColor>
                    <Text color="yellow">A</Text> Toggle │
                    <Text color="yellow"> S</Text> Scan LLMs │
                    <Text color="yellow"> +/-</Text> Risk │
                    <Text color="yellow"> T</Text> Auto-Trade │
                    <Text color="yellow"> 8</Text> View Thoughts
                </Text>
            </Box>
        </Box>
    );
};
