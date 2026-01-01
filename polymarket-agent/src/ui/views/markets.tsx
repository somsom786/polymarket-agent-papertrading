/**
 * Markets View - Browse prediction markets
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Panel, Probability, Loading, EmptyState, truncate } from '../components.js';
import { useStore } from '../store.js';

export const MarketsView: React.FC = () => {
    const { markets, selectedMarketIndex, isLoadingMarkets } = useStore();

    if (isLoadingMarkets) {
        return (
            <Box padding={2}>
                <Loading message="Fetching markets from Polymarket..." />
            </Box>
        );
    }

    if (markets.length === 0) {
        return (
            <Box padding={2}>
                <Panel title="🎯 Markets">
                    <EmptyState message="No markets loaded. Press [R] to refresh." />
                </Panel>
            </Box>
        );
    }

    // Pagination
    const pageSize = 15;
    const currentPage = Math.floor(selectedMarketIndex / pageSize);
    const startIndex = currentPage * pageSize;
    const visibleMarkets = markets.slice(startIndex, startIndex + pageSize);
    const totalPages = Math.ceil(markets.length / pageSize);

    return (
        <Box flexDirection="column" padding={1}>
            <Panel title={`🎯 Active Markets (${markets.length})`} borderColor="cyan">
                {/* Header */}
                <Box paddingBottom={1}>
                    <Box width={4}><Text bold dimColor>#</Text></Box>
                    <Box width={38}><Text bold dimColor>Question</Text></Box>
                    <Box width={10}><Text bold dimColor>Category</Text></Box>
                    <Box width={9}><Text bold dimColor>YES</Text></Box>
                    <Box width={9}><Text bold dimColor>NO</Text></Box>
                    <Box width={12}><Text bold dimColor>Volume</Text></Box>
                    <Box width={10}><Text bold dimColor>Ends</Text></Box>
                </Box>

                {/* Market rows */}
                {visibleMarkets.map((market, i) => {
                    const globalIndex = startIndex + i;
                    const isSelected = globalIndex === selectedMarketIndex;
                    const yesToken = market.tokens.find(t => t.outcome.toLowerCase() === 'yes');
                    const noToken = market.tokens.find(t => t.outcome.toLowerCase() === 'no');

                    const endDate = market.end_date_iso
                        ? new Date(market.end_date_iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : 'N/A';

                    return (
                        <Box
                            key={market.condition_id}
                            backgroundColor={isSelected ? 'blue' : undefined}
                        >
                            <Box width={4}>
                                <Text color={isSelected ? 'white' : 'gray'}>{globalIndex + 1}</Text>
                            </Box>
                            <Box width={38}>
                                <Text color={isSelected ? 'white' : undefined} wrap="truncate-end">
                                    {truncate(market.question, 36)}
                                </Text>
                            </Box>
                            <Box width={10}>
                                <Text dimColor>{truncate(market.category || 'N/A', 8)}</Text>
                            </Box>
                            <Box width={9}>
                                <Probability value={market.yesPrice} />
                            </Box>
                            <Box width={9}>
                                <Probability value={market.noPrice} />
                            </Box>
                            <Box width={12}>
                                <Text dimColor>
                                    {market.volume24h >= 1000000
                                        ? `$${(market.volume24h / 1000000).toFixed(1)}M`
                                        : market.volume24h >= 1000
                                            ? `$${(market.volume24h / 1000).toFixed(0)}K`
                                            : `$${market.volume24h.toFixed(0)}`}
                                </Text>
                            </Box>
                            <Box width={10}>
                                <Text dimColor>{endDate}</Text>
                            </Box>
                        </Box>
                    );
                })}
            </Panel>

            {/* Selected Market Details */}
            {markets[selectedMarketIndex] && (
                <Box marginTop={1}>
                    <Panel title="📋 Market Details" borderColor="yellow">
                        <Box flexDirection="column">
                            <Text bold wrap="wrap">{markets[selectedMarketIndex].question}</Text>
                            <Box marginTop={1}>
                                <Box width="50%">
                                    <Text dimColor>Category: </Text>
                                    <Text>{markets[selectedMarketIndex].category || 'N/A'}</Text>
                                </Box>
                                <Box width="50%">
                                    <Text dimColor>Min Order: </Text>
                                    <Text>${markets[selectedMarketIndex].minimum_order_size}</Text>
                                </Box>
                            </Box>
                            <Box>
                                <Box width="50%">
                                    <Text dimColor>Status: </Text>
                                    <Text color={markets[selectedMarketIndex].active ? 'green' : 'red'}>
                                        {markets[selectedMarketIndex].active ? 'Active' : 'Inactive'}
                                    </Text>
                                </Box>
                                <Box width="50%">
                                    <Text dimColor>Ends: </Text>
                                    <Text>
                                        {markets[selectedMarketIndex].end_date_iso
                                            ? new Date(markets[selectedMarketIndex].end_date_iso).toLocaleDateString()
                                            : 'N/A'}
                                    </Text>
                                </Box>
                            </Box>
                        </Box>
                    </Panel>
                </Box>
            )}

            {/* Navigation */}
            <Box marginTop={1} justifyContent="space-between" paddingX={1}>
                <Text>
                    Page <Text color="cyan">{currentPage + 1}</Text> of <Text color="cyan">{totalPages}</Text>
                    <Text dimColor> (sorted by volume)</Text>
                </Text>
                <Text dimColor>
                    <Text color="yellow">↑/↓</Text> Navigate │
                    <Text color="yellow"> P</Text> Page Up │
                    <Text color="yellow"> B</Text> Buy YES │
                    <Text color="yellow"> N</Text> Buy NO │
                    <Text color="yellow"> R</Text> Refresh
                </Text>
            </Box>
        </Box>
    );
};
