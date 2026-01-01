/**
 * Navigation Bar Component
 */

import React from 'react';
import { Box, Text } from 'ink';
import type { ViewType } from './store.js';

interface NavItem {
    key: string;
    view: ViewType;
    label: string;
    icon: string;
}

const navItems: NavItem[] = [
    { key: '1', view: 'dashboard', label: 'Home', icon: '📊' },
    { key: '2', view: 'markets', label: 'Markets', icon: '🎯' },
    { key: '3', view: 'events', label: 'Events', icon: '🎲' },
    { key: '4', view: 'portfolio', label: 'Portfolio', icon: '💼' },
    { key: '5', view: 'trades', label: 'Trades', icon: '📝' },
    { key: '6', view: 'agent', label: 'Agent', icon: '🤖' },
    { key: '7', view: 'thoughts', label: 'Thoughts', icon: '🧠' },
    { key: '8', view: 'settings', label: 'Settings', icon: '⚙️' },
];

interface NavBarProps {
    currentView: ViewType;
}

export const NavBar: React.FC<NavBarProps> = ({ currentView }) => (
    <Box paddingX={1} paddingY={0}>
        {navItems.map((item, index) => (
            <React.Fragment key={item.view}>
                <Box marginRight={1}>
                    <Text
                        color={currentView === item.view ? 'cyan' : 'gray'}
                        bold={currentView === item.view}
                    >
                        [{item.key}] {item.icon} {item.label}
                    </Text>
                </Box>
                {index < navItems.length - 1 && <Text dimColor>│</Text>}
            </React.Fragment>
        ))}
        <Box marginLeft={1}>
            <Text color="red">[Q] Quit</Text>
        </Box>
    </Box>
);

// Control bar at bottom
interface ControlBarProps {
    controls: { key: string; label: string }[];
}

export const ControlBar: React.FC<ControlBarProps> = ({ controls }) => (
    <Box paddingX={1} borderStyle="single" borderColor="gray">
        <Text dimColor>Controls: </Text>
        {controls.map((ctrl, i) => (
            <React.Fragment key={ctrl.key}>
                <Text color="yellow">{ctrl.key}</Text>
                <Text dimColor> {ctrl.label}</Text>
                {i < controls.length - 1 && <Text dimColor>  │  </Text>}
            </React.Fragment>
        ))}
    </Box>
);
