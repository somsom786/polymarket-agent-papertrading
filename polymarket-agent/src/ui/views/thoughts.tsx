/**
 * Thoughts View - See what the LLM is thinking
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Panel, EmptyState, formatTime, truncate } from '../components.js';
import { useStore } from '../store.js';

export const ThoughtsView: React.FC = () => {
    const { llmThoughts, selectedModel, riskLevel, strategy } = useStore();

    const recentThoughts = llmThoughts.slice(-10).reverse();

    return (
        <Box flexDirection="column" padding={1}>
            {/* Header */}
            <Box marginBottom={1}>
                <Panel title="🧠 LLM Thoughts" borderColor="magenta">
                    <Box justifyContent="space-between">
                        <Box>
                            <Text dimColor>Model: </Text>
                            <Text color="cyan" bold>
                                {selectedModel ? `${selectedModel.name} (${selectedModel.provider})` : 'None selected'}
                            </Text>
                        </Box>
                        <Box>
                            <Text dimColor>Risk Level: </Text>
                            <Text color={riskLevel >= 7 ? 'red' : riskLevel >= 4 ? 'yellow' : 'green'} bold>
                                {riskLevel}/10 {riskLevel >= 8 ? '🔥' : riskLevel >= 5 ? '⚡' : '🛡️'}
                            </Text>
                        </Box>
                        <Box>
                            <Text dimColor>Strategy: </Text>
                            <Text color="yellow" bold>{strategy}</Text>
                        </Box>
                    </Box>
                </Panel>
            </Box>

            {/* Thoughts List */}
            {strategy !== 'llm' ? (
                <Panel title="📋 AI Analysis Log">
                    <EmptyState message="Go to Agent view (6) and press [I] to enable LLM strategy" />
                </Panel>
            ) : recentThoughts.length === 0 ? (
                <Panel title="📋 AI Analysis Log">
                    <EmptyState message="No thoughts yet. Enable auto-trade (T) to see AI reasoning." />
                </Panel>
            ) : (
                <Box flexDirection="column">
                    {recentThoughts.map((thought, i) => (
                        <Box key={thought.id} marginBottom={1}>
                            <Panel
                                title={`💭 ${truncate(thought.marketQuestion, 50)}`}
                                borderColor={thought.confidence >= 0.7 ? 'green' : thought.confidence >= 0.4 ? 'yellow' : 'gray'}
                            >
                                <Box flexDirection="column">
                                    {/* Timestamp and Confidence */}
                                    <Box justifyContent="space-between" marginBottom={1}>
                                        <Text dimColor>{formatTime(thought.timestamp)}</Text>
                                        <Box>
                                            <Text dimColor>Confidence: </Text>
                                            <Text
                                                color={thought.confidence >= 0.7 ? 'green' : thought.confidence >= 0.4 ? 'yellow' : 'gray'}
                                                bold
                                            >
                                                {(thought.confidence * 100).toFixed(0)}%
                                            </Text>
                                        </Box>
                                    </Box>

                                    {/* Thinking Process */}
                                    <Box marginBottom={1}>
                                        <Text dimColor>🤔 Thinking: </Text>
                                    </Box>
                                    <Box paddingLeft={2} marginBottom={1}>
                                        <Text wrap="wrap">{thought.thinking.slice(0, 300)}...</Text>
                                    </Box>

                                    {/* Decision */}
                                    <Box marginBottom={1}>
                                        <Text dimColor>✅ Decision: </Text>
                                        <Text color="cyan" bold>{thought.decision.slice(0, 100)}</Text>
                                    </Box>

                                    {/* Reasoning Points */}
                                    {thought.reasoning.length > 0 && (
                                        <Box flexDirection="column">
                                            <Text dimColor>📝 Key Points:</Text>
                                            {thought.reasoning.slice(0, 3).map((reason, j) => (
                                                <Box key={j} paddingLeft={2}>
                                                    <Text>• {truncate(reason, 60)}</Text>
                                                </Box>
                                            ))}
                                        </Box>
                                    )}
                                </Box>
                            </Panel>
                        </Box>
                    ))}
                </Box>
            )}

            {/* Controls */}
            <Box marginTop={1} paddingX={1}>
                <Text dimColor>
                    <Text color="cyan">🧠 Thoughts</Text> (View 7) │
                    <Text color="yellow"> +/-</Text> Adjust Risk │
                    <Text color="yellow"> 6</Text> Agent View │
                    <Text color="yellow"> 8</Text> Settings
                </Text>
            </Box>
        </Box>
    );
};
