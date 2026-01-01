/**
 * Trades View - Trade history
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Panel, Currency, EmptyState, truncate, formatTime } from '../components.js';
import { useStore } from '../store.js';

export const TradesView: React.FC = () => {
    const { trades } = useStore();

    // Calculate stats
    const buyTrades = trades.filter(t => t.side === 'BUY');
    const sellTrades = trades.filter(t => t.side === 'SELL');
    const totalVolume = trades.reduce((sum, t) => sum + t.totalCost, 0);
    const totalFees = trades.reduce((sum, t) => sum + t.fees, 0);
    const realizedPnL = sellTrades.reduce((sum, t) => sum + (t.realizedPnL || 0), 0);

    return (
        <Box flexDirection="column" padding={1}>
            {/* Stats */}
            <Box>
                <Box width="20%" marginRight={1}>
                    <Panel title="📝 Total Trades" borderColor="cyan">
                        <Text bold color="cyan">{trades.length}</Text>
                    </Panel>
                </Box>
                <Box width="20%" marginRight={1}>
                    <Panel title="🟢 Buys" borderColor="green">
                        <Text bold color="green">{buyTrades.length}</Text>
                    </Panel>
                </Box>
                <Box width="20%" marginRight={1}>
                    <Panel title="🔴 Sells" borderColor="red">
                        <Text bold color="red">{sellTrades.length}</Text>
                    </Panel>
                </Box>
                <Box width="20%" marginRight={1}>
                    <Panel title="💵 Volume" borderColor="yellow">
                        <Currency value={totalVolume} />
                    </Panel>
                </Box>
                <Box width="20%">
                    <Panel title="📈 Realized P&L" borderColor={realizedPnL >= 0 ? 'green' : 'red'}>
                        <Currency value={realizedPnL} showSign />
                    </Panel>
                </Box>
            </Box>

            {/* Trade History */}
            <Box marginTop={1}>
                <Panel title="📋 Trade History" borderColor="gray">
                    {trades.length === 0 ? (
                        <EmptyState message="No trades yet. Go to Markets to start trading." />
                    ) : (
                        <Box flexDirection="column">
                            {/* Header */}
                            <Box paddingBottom={1} borderStyle="single" borderBottom borderColor="gray">
                                <Box width={10}><Text bold dimColor>Time</Text></Box>
                                <Box width={6}><Text bold dimColor>Side</Text></Box>
                                <Box width={6}><Text bold dimColor>Type</Text></Box>
                                <Box width={30}><Text bold dimColor>Market</Text></Box>
                                <Box width={10}><Text bold dimColor>Shares</Text></Box>
                                <Box width={10}><Text bold dimColor>Price</Text></Box>
                                <Box width={12}><Text bold dimColor>Total</Text></Box>
                                <Box width={10}><Text bold dimColor>Fees</Text></Box>
                                <Box width={12}><Text bold dimColor>P&L</Text></Box>
                            </Box>

                            {/* Trade rows */}
                            {trades.slice(0, 20).map((trade) => (
                                <Box key={trade.id}>
                                    <Box width={10}>
                                        <Text dimColor>{formatTime(trade.timestamp)}</Text>
                                    </Box>
                                    <Box width={6}>
                                        <Text color={trade.side === 'BUY' ? 'green' : 'red'} bold>
                                            {trade.side}
                                        </Text>
                                    </Box>
                                    <Box width={6}>
                                        <Text color={trade.outcome === 'YES' ? 'green' : 'red'}>
                                            {trade.outcome}
                                        </Text>
                                    </Box>
                                    <Box width={30}>
                                        <Text wrap="truncate-end">{truncate(trade.marketQuestion, 28)}</Text>
                                    </Box>
                                    <Box width={10}>
                                        <Text>{trade.shares.toFixed(0)}</Text>
                                    </Box>
                                    <Box width={10}>
                                        <Text>${trade.price.toFixed(4)}</Text>
                                    </Box>
                                    <Box width={12}>
                                        <Currency value={trade.totalCost} />
                                    </Box>
                                    <Box width={10}>
                                        <Text dimColor>${trade.fees.toFixed(2)}</Text>
                                    </Box>
                                    <Box width={12}>
                                        {trade.realizedPnL !== undefined ? (
                                            <Currency value={trade.realizedPnL} showSign />
                                        ) : (
                                            <Text dimColor>-</Text>
                                        )}
                                    </Box>
                                </Box>
                            ))}

                            {trades.length > 20 && (
                                <Box marginTop={1}>
                                    <Text dimColor>... and {trades.length - 20} more trades</Text>
                                </Box>
                            )}
                        </Box>
                    )}
                </Panel>
            </Box>

            {/* Footer stats */}
            <Box marginTop={1} justifyContent="space-between" paddingX={1}>
                <Text dimColor>
                    Total Fees: <Text color="yellow">${totalFees.toFixed(2)}</Text>
                </Text>
                <Text dimColor>
                    <Text color="yellow">E</Text> Export CSV │
                    <Text color="yellow">C</Text> Clear History
                </Text>
            </Box>
        </Box>
    );
};
