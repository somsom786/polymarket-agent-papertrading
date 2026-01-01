/**
 * Dashboard View - Main overview
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Panel, Currency, Percentage, StatusIndicator, formatTime, truncate } from '../components.js';
import { useStore } from '../store.js';

export const DashboardView: React.FC = () => {
    const { portfolio, positions, agentStatus, agentLogs, markets } = useStore();

    const summary = portfolio || {
        cash: 100000,
        positionsValue: 0,
        totalValue: 100000,
        totalPnL: 0,
        totalPnLPercent: 0,
        positionCount: 0,
        tradeCount: 0,
        winRate: 0,
    };

    return (
        <Box flexDirection="column" padding={1}>
            {/* Portfolio Summary */}
            <Panel title="📊 Portfolio Overview" borderColor="cyan">
                <Box justifyContent="space-between">
                    <Box flexDirection="column" width="25%">
                        <Text dimColor>Cash Balance</Text>
                        <Currency value={summary.cash} />
                    </Box>
                    <Box flexDirection="column" width="25%">
                        <Text dimColor>Positions Value</Text>
                        <Currency value={summary.positionsValue} />
                    </Box>
                    <Box flexDirection="column" width="25%">
                        <Text dimColor>Total Value</Text>
                        <Text bold color="cyan">
                            <Currency value={summary.totalValue} />
                        </Text>
                    </Box>
                    <Box flexDirection="column" width="25%">
                        <Text dimColor>Total P&L</Text>
                        <Box>
                            <Currency value={summary.totalPnL} showSign />
                            <Text dimColor> (</Text>
                            <Percentage value={summary.totalPnLPercent} />
                            <Text dimColor>)</Text>
                        </Box>
                    </Box>
                </Box>
                <Box marginTop={1} justifyContent="space-between">
                    <Text>📈 Positions: <Text color="cyan">{summary.positionCount}</Text></Text>
                    <Text>📝 Trades: <Text color="cyan">{summary.tradeCount}</Text></Text>
                    <Text>🎯 Win Rate: <Text color={summary.winRate > 50 ? 'green' : 'yellow'}>{summary.winRate.toFixed(1)}%</Text></Text>
                </Box>
            </Panel>

            <Box marginTop={1}>
                {/* Active Positions */}
                <Box width="50%" marginRight={1}>
                    <Panel title="💼 Active Positions" borderColor="yellow">
                        {positions.length === 0 ? (
                            <Text dimColor>No open positions</Text>
                        ) : (
                            <Box flexDirection="column">
                                {positions.slice(0, 5).map((pos, i) => (
                                    <Box key={pos.id} justifyContent="space-between">
                                        <Text>
                                            <Text color={pos.outcome === 'YES' ? 'green' : 'red'}>{pos.outcome}</Text>
                                            <Text dimColor> {truncate(pos.marketQuestion, 25)}</Text>
                                        </Text>
                                        <Currency value={pos.unrealizedPnL} showSign />
                                    </Box>
                                ))}
                                {positions.length > 5 && (
                                    <Text dimColor>... and {positions.length - 5} more</Text>
                                )}
                            </Box>
                        )}
                    </Panel>
                </Box>

                {/* Agent Status */}
                <Box width="50%">
                    <Panel title="🤖 Agent Status" borderColor={agentStatus?.isRunning ? 'green' : 'gray'}>
                        <Box justifyContent="space-between">
                            <StatusIndicator
                                active={agentStatus?.isRunning || false}
                                activeLabel="Running"
                                inactiveLabel="Stopped"
                            />
                            <Text>Strategy: <Text color="cyan">{agentStatus?.strategy || 'balanced'}</Text></Text>
                        </Box>
                        <Box marginTop={1} flexDirection="column">
                            <Text dimColor>
                                Markets: <Text color="white">{agentStatus?.marketsAnalyzed || 0}</Text>
                                {' | '}
                                Opportunities: <Text color="yellow">{agentStatus?.opportunitiesFound || 0}</Text>
                                {' | '}
                                Trades: <Text color="green">{agentStatus?.tradesExecuted || 0}</Text>
                            </Text>
                        </Box>
                    </Panel>
                </Box>
            </Box>

            {/* Agent Logs */}
            <Box marginTop={1}>
                <Panel title="📋 Recent Activity" borderColor="gray">
                    <Box flexDirection="column" height={6}>
                        {agentLogs.length === 0 ? (
                            <Text dimColor>No activity yet. Press [A] to start the agent.</Text>
                        ) : (
                            agentLogs.slice(-5).map((log, i) => (
                                <Box key={i}>
                                    <Text dimColor>[{formatTime(log.timestamp)}]</Text>
                                    <Text color={
                                        log.level === 'ERROR' ? 'red' :
                                            log.level === 'WARN' ? 'yellow' :
                                                log.level === 'TRADE' ? 'green' : 'white'
                                    }> {log.message}</Text>
                                </Box>
                            ))
                        )}
                    </Box>
                </Panel>
            </Box>

            {/* Quick Stats */}
            <Box marginTop={1} justifyContent="space-between" paddingX={1}>
                <Text dimColor>
                    Markets Loaded: <Text color="cyan">{markets.length}</Text>
                </Text>
                <Text dimColor>
                    Last Update: <Text color="cyan">{agentStatus?.lastAnalysisTime ? formatTime(agentStatus.lastAnalysisTime) : 'Never'}</Text>
                </Text>
                <Text dimColor>
                    Press <Text color="yellow">[H]</Text> for help
                </Text>
            </Box>
        </Box>
    );
};
