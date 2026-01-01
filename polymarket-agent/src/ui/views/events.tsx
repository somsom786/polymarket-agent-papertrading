/**
 * Events View - Multi-outcome markets (e.g., Super Bowl, Elections)
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Panel, Probability, Loading, EmptyState, truncate, Currency } from '../components.js';
import { useStore } from '../store.js';

export const EventsView: React.FC = () => {
    const {
        events,
        selectedEventIndex,
        selectedOutcomeIndex,
        isLoadingEvents
    } = useStore();

    if (isLoadingEvents) {
        return (
            <Box padding={2}>
                <Loading message="Fetching multi-outcome events from Polymarket..." />
            </Box>
        );
    }

    // Filter to only multi-outcome events
    const multiEvents = events.filter(e => e.isMultiOutcome && e.outcomeCount > 2);

    if (multiEvents.length === 0) {
        return (
            <Box padding={2}>
                <Panel title="🎲 Multi-Outcome Events">
                    <EmptyState message="No multi-outcome events loaded. Press [R] to refresh." />
                </Panel>
            </Box>
        );
    }

    const selectedEvent = multiEvents[selectedEventIndex] || multiEvents[0];
    const outcomes = selectedEvent?.outcomes || [];

    // Pagination for events list
    const pageSize = 8;
    const currentPage = Math.floor(selectedEventIndex / pageSize);
    const startIndex = currentPage * pageSize;
    const visibleEvents = multiEvents.slice(startIndex, startIndex + pageSize);
    const totalPages = Math.ceil(multiEvents.length / pageSize);

    return (
        <Box flexDirection="column" padding={1}>
            {/* Events List */}
            <Panel title={`🎲 Multi-Outcome Events (${multiEvents.length})`} borderColor="magenta">
                {/* Header */}
                <Box paddingBottom={1}>
                    <Box width={4}><Text bold dimColor>#</Text></Box>
                    <Box width={45}><Text bold dimColor>Event</Text></Box>
                    <Box width={12}><Text bold dimColor>Category</Text></Box>
                    <Box width={10}><Text bold dimColor>Outcomes</Text></Box>
                    <Box width={15}><Text bold dimColor>Volume</Text></Box>
                    <Box width={12}><Text bold dimColor>End Date</Text></Box>
                </Box>

                {/* Event rows */}
                {visibleEvents.map((event, i) => {
                    const globalIndex = startIndex + i;
                    const isSelected = globalIndex === selectedEventIndex;
                    const endDate = event.endDate
                        ? new Date(event.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : 'N/A';

                    return (
                        <Box
                            key={event.id}
                            backgroundColor={isSelected ? 'magenta' : undefined}
                        >
                            <Box width={4}>
                                <Text color={isSelected ? 'white' : 'gray'}>{globalIndex + 1}</Text>
                            </Box>
                            <Box width={45}>
                                <Text color={isSelected ? 'white' : undefined} wrap="truncate-end">
                                    {truncate(event.title, 43)}
                                </Text>
                            </Box>
                            <Box width={12}>
                                <Text dimColor>{truncate(event.category || 'N/A', 10)}</Text>
                            </Box>
                            <Box width={10}>
                                <Text color="cyan">{event.outcomeCount}</Text>
                            </Box>
                            <Box width={15}>
                                <Text dimColor>${(event.totalVolume / 1000000).toFixed(2)}M</Text>
                            </Box>
                            <Box width={12}>
                                <Text dimColor>{endDate}</Text>
                            </Box>
                        </Box>
                    );
                })}
            </Panel>

            {/* Selected Event Details with Outcomes */}
            {selectedEvent && (
                <Box marginTop={1}>
                    <Panel title={`📊 ${truncate(selectedEvent.title, 60)}`} borderColor="cyan">
                        <Box flexDirection="column">
                            {/* Outcomes Table Header */}
                            <Box paddingBottom={1}>
                                <Box width={4}><Text bold dimColor>#</Text></Box>
                                <Box width={35}><Text bold dimColor>Outcome</Text></Box>
                                <Box width={12}><Text bold dimColor>Probability</Text></Box>
                                <Box width={15}><Text bold dimColor>Price</Text></Box>
                                <Box width={20}><Text bold dimColor>Action</Text></Box>
                            </Box>

                            {/* Outcomes list - show top 10 */}
                            {outcomes.slice(0, 10).map((outcome, i) => {
                                const isOutcomeSelected = i === selectedOutcomeIndex;
                                const probability = outcome.price * 100;

                                // Color based on probability
                                let probColor = 'gray';
                                if (probability > 50) probColor = 'green';
                                else if (probability > 20) probColor = 'yellow';
                                else if (probability > 10) probColor = 'cyan';

                                return (
                                    <Box
                                        key={outcome.tokenId}
                                        backgroundColor={isOutcomeSelected ? 'blue' : undefined}
                                    >
                                        <Box width={4}>
                                            <Text color={isOutcomeSelected ? 'white' : 'gray'}>{i + 1}</Text>
                                        </Box>
                                        <Box width={35}>
                                            <Text color={isOutcomeSelected ? 'white' : undefined}>
                                                {truncate(outcome.name, 33)}
                                            </Text>
                                        </Box>
                                        <Box width={12}>
                                            <Text color={probColor} bold>
                                                {probability.toFixed(1)}%
                                            </Text>
                                        </Box>
                                        <Box width={15}>
                                            <Text color="green">{(outcome.price * 100).toFixed(1)}¢</Text>
                                        </Box>
                                        <Box width={20}>
                                            {isOutcomeSelected && (
                                                <Text color="yellow">Press [B] to buy</Text>
                                            )}
                                        </Box>
                                    </Box>
                                );
                            })}

                            {outcomes.length > 10 && (
                                <Box marginTop={1}>
                                    <Text dimColor>... and {outcomes.length - 10} more outcomes</Text>
                                </Box>
                            )}
                        </Box>
                    </Panel>
                </Box>
            )}

            {/* Navigation */}
            <Box marginTop={1} justifyContent="space-between" paddingX={1}>
                <Text>
                    Page <Text color="cyan">{currentPage + 1}</Text> of <Text color="cyan">{totalPages}</Text>
                    {selectedEvent && (
                        <Text dimColor> │ Showing {Math.min(10, outcomes.length)} of {outcomes.length} outcomes</Text>
                    )}
                </Text>
                <Text dimColor>
                    <Text color="yellow">↑/↓</Text> Event │
                    <Text color="yellow"> ←/→</Text> Outcome │
                    <Text color="yellow"> B</Text> Buy │
                    <Text color="yellow"> R</Text> Refresh
                </Text>
            </Box>
        </Box>
    );
};
