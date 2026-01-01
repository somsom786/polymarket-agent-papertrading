/**
 * Help Modal
 */

import React from 'react';
import { Box, Text } from 'ink';

interface ShortcutGroup {
    title: string;
    shortcuts: { key: string; action: string }[];
}

const shortcutGroups: ShortcutGroup[] = [
    {
        title: 'Navigation',
        shortcuts: [
            { key: '1-7', action: 'Switch views' },
            { key: 'H', action: 'Toggle help' },
            { key: 'Q', action: 'Quit application' },
        ],
    },
    {
        title: 'Markets',
        shortcuts: [
            { key: '↑/↓', action: 'Navigate markets' },
            { key: 'R', action: 'Refresh markets' },
            { key: 'B', action: 'Buy YES on selected' },
            { key: 'N', action: 'Buy NO on selected' },
        ],
    },
    {
        title: 'Events (Multi)',
        shortcuts: [
            { key: '↑/↓', action: 'Navigate events' },
            { key: '←/→', action: 'Select outcome' },
            { key: 'B', action: 'Buy selected' },
            { key: 'R', action: 'Refresh events' },
        ],
    },
    {
        title: 'Portfolio',
        shortcuts: [
            { key: 'S', action: 'Sell position' },
            { key: 'C', action: 'Close all positions' },
            { key: 'X', action: 'Reset portfolio' },
        ],
    },
    {
        title: 'Agent',
        shortcuts: [
            { key: 'A', action: 'Start/Stop agent' },
            { key: 'M/C/V/L/R', action: 'Strategy' },
            { key: 'T', action: 'Toggle auto-trade' },
        ],
    },
];

export const HelpModal: React.FC = () => (
    <Box
        flexDirection="column"
        borderStyle="round"
        borderColor="yellow"
        padding={1}
    >
        <Box justifyContent="center" marginBottom={1}>
            <Text bold color="yellow">📖 KEYBOARD SHORTCUTS</Text>
        </Box>

        <Box>
            {shortcutGroups.map((group) => (
                <Box key={group.title} width={22} flexDirection="column" marginRight={1}>
                    <Text bold color="cyan" underline>{group.title}</Text>
                    {group.shortcuts.map((s) => (
                        <Box key={s.key}>
                            <Box width={10}>
                                <Text color="yellow">[{s.key}]</Text>
                            </Box>
                            <Text dimColor>{s.action}</Text>
                        </Box>
                    ))}
                </Box>
            ))}
        </Box>

        <Box marginTop={1} justifyContent="center">
            <Text dimColor>Press </Text>
            <Text color="yellow">[H]</Text>
            <Text dimColor> to close</Text>
        </Box>
    </Box>
);
