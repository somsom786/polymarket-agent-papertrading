/**
 * Portfolio View - Show positions and P&L
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Panel, Currency, Percentage, EmptyState, truncate } from '../components.js';
import { useStore } from '../store.js';

export const PortfolioView: React.FC = () => {
    const { portfolio, positions } = useStore();

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
            {/* Summary Cards */}
            <Box>
                <Box width="25%" marginRight={1}>
                    <Panel title="💵 Cash" borderColor="green">
                        <Currency value={summary.cash} />
                    </Panel>
                </Box>
                <Box width="25%" marginRight={1}>
                    <Panel title="📊 Positions" borderColor="yellow">
                        <Currency value={summary.positionsValue} />
                    </Panel>
                </Box>
                <Box width="25%" marginRight={1}>
                    <Panel title="💰 Total Value" borderColor="cyan">
                        <Text bold><Currency value={summary.totalValue} /></Text>
                    </Panel>
                </Box>
                <Box width="25%">
                    <Panel title="📈 P&L" borderColor={summary.totalPnL >= 0 ? 'green' : 'red'}>
                        <Box>
                            <Currency value={summary.totalPnL} showSign />
                            <Text dimColor> (</Text>
                            <Percentage value={summary.totalPnLPercent} />
                            <Text dimColor>)</Text>
                        </Box>
                    </Panel>
                </Box>
            </Box>

            {/* Positions Table */}
            <Box marginTop={1}>
                <Panel title={`💼 Open Positions (${positions.length})`} borderColor="yellow">
                    {positions.length === 0 ? (
                        <EmptyState message="No open positions. Go to Markets to make a trade." />
                    ) : (
                        <Box flexDirection="column">
                            {/* Header */}
                            <Box paddingBottom={1} borderStyle="single" borderBottom borderColor="gray">
                                <Box width={35}><Text bold dimColor>Market</Text></Box>
                                <Box width={8}><Text bold dimColor>Side</Text></Box>
                                <Box width={10}><Text bold dimColor>Shares</Text></Box>
                                <Box width={10}><Text bold dimColor>Avg Price</Text></Box>
                                <Box width={10}><Text bold dimColor>Current</Text></Box>
                                <Box width={12}><Text bold dimColor>Value</Text></Box>
                                <Box width={15}><Text bold dimColor>P&L</Text></Box>
                            </Box>

                            {/* Position rows */}
                            {positions.map((pos) => {
                                const value = pos.shares * pos.currentPrice;
                                const pnlPercent = ((pos.currentPrice - pos.avgPrice) / pos.avgPrice) * 100;

                                return (
                                    <Box key={pos.id}>
                                        <Box width={35}>
                                            <Text wrap="truncate-end">{truncate(pos.marketQuestion, 33)}</Text>
                                        </Box>
                                        <Box width={8}>
                                            <Text color={pos.outcome === 'YES' ? 'green' : 'red'} bold>
                                                {pos.outcome}
                                            </Text>
                                        </Box>
                                        <Box width={10}>
                                            <Text>{pos.shares.toFixed(0)}</Text>
                                        </Box>
                                        <Box width={10}>
                                            <Text>${pos.avgPrice.toFixed(2)}</Text>
                                        </Box>
                                        <Box width={10}>
                                            <Text color={pos.currentPrice > pos.avgPrice ? 'green' : pos.currentPrice < pos.avgPrice ? 'red' : 'white'}>
                                                ${pos.currentPrice.toFixed(2)}
                                            </Text>
                                        </Box>
                                        <Box width={12}>
                                            <Currency value={value} />
                                        </Box>
                                        <Box width={15}>
                                            <Currency value={pos.unrealizedPnL} showSign />
                                            <Text dimColor> (</Text>
                                            <Percentage value={pnlPercent} />
                                            <Text dimColor>)</Text>
                                        </Box>
                                    </Box>
                                );
                            })}

                            {/* Total */}
                            <Box marginTop={1} paddingTop={1} borderStyle="single" borderTop borderColor="gray">
                                <Box width={73}><Text bold>Total</Text></Box>
                                <Box width={12}>
                                    <Text bold><Currency value={summary.positionsValue} /></Text>
                                </Box>
                                <Box width={15}>
                                    <Text bold>
                                        <Currency
                                            value={positions.reduce((sum, p) => sum + p.unrealizedPnL, 0)}
                                            showSign
                                        />
                                    </Text>
                                </Box>
                            </Box>
                        </Box>
                    )}
                </Panel>
            </Box>

            {/* Stats */}
            <Box marginTop={1} justifyContent="space-between" paddingX={1}>
                <Text dimColor>
                    Trades: <Text color="cyan">{summary.tradeCount}</Text> │
                    Win Rate: <Text color={summary.winRate > 50 ? 'green' : 'yellow'}>{summary.winRate.toFixed(1)}%</Text>
                </Text>
                <Text dimColor>
                    <Text color="yellow">S</Text> Sell Position │
                    <Text color="yellow">C</Text> Close All │
                    <Text color="yellow">X</Text> Reset Portfolio
                </Text>
            </Box>
        </Box>
    );
};
