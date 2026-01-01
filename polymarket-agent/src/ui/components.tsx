/**
 * Shared UI Components
 */

import React from 'react';
import { Box, Text } from 'ink';

// Box with border
interface PanelProps {
    title?: string;
    children: React.ReactNode;
    width?: number | string;
    height?: number | string;
    borderColor?: string;
}

export const Panel: React.FC<PanelProps> = ({
    title,
    children,
    width = '100%',
    height,
    borderColor = 'gray'
}) => (
    <Box
        flexDirection="column"
        borderStyle="round"
        borderColor={borderColor}
        width={width}
        height={height}
        paddingX={1}
    >
        {title && (
            <Box marginBottom={0}>
                <Text bold color="cyan">
                    {title}
                </Text>
            </Box>
        )}
        {children}
    </Box>
);

// Formatted currency
interface CurrencyProps {
    value: number;
    showSign?: boolean;
    color?: string;
}

export const Currency: React.FC<CurrencyProps> = ({ value, showSign = false, color }) => {
    const formattedValue = Math.abs(value).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

    let displayColor = color;
    let prefix = '';

    if (showSign) {
        if (value > 0) {
            displayColor = displayColor || 'green';
            prefix = '+';
        } else if (value < 0) {
            displayColor = displayColor || 'red';
            prefix = '-';
        }
    }

    const display = value < 0 && showSign ? `-${formattedValue}` : `${prefix}${formattedValue}`;

    return <Text color={displayColor}>{display}</Text>;
};

// Percentage display
interface PercentageProps {
    value: number;
    showSign?: boolean;
}

export const Percentage: React.FC<PercentageProps> = ({ value, showSign = true }) => {
    const color = value > 0 ? 'green' : value < 0 ? 'red' : 'white';
    const prefix = showSign && value > 0 ? '+' : '';

    return (
        <Text color={color}>
            {prefix}{value.toFixed(2)}%
        </Text>
    );
};

// Price display for prediction markets (0-100%)
interface ProbabilityProps {
    value: number;
    label?: string;
}

export const Probability: React.FC<ProbabilityProps> = ({ value, label }) => {
    const percent = value * 100;
    const color = percent > 60 ? 'green' : percent < 40 ? 'red' : 'yellow';

    return (
        <Text>
            {label && <Text dimColor>{label}: </Text>}
            <Text color={color}>{percent.toFixed(1)}¢</Text>
        </Text>
    );
};

// Status indicator
interface StatusIndicatorProps {
    active: boolean;
    activeLabel?: string;
    inactiveLabel?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
    active,
    activeLabel = 'Active',
    inactiveLabel = 'Inactive',
}) => (
    <Text color={active ? 'green' : 'gray'}>
        {active ? '● ' : '○ '}
        {active ? activeLabel : inactiveLabel}
    </Text>
);

// Loading spinner
interface LoadingProps {
    message?: string;
}

export const Loading: React.FC<LoadingProps> = ({ message = 'Loading...' }) => (
    <Box>
        <Text color="cyan">⟳ {message}</Text>
    </Box>
);

// Empty state
interface EmptyStateProps {
    message: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message }) => (
    <Box justifyContent="center" paddingY={2}>
        <Text dimColor>{message}</Text>
    </Box>
);

// Keyboard shortcut hint
interface ShortcutProps {
    keys: string;
    description: string;
}

export const Shortcut: React.FC<ShortcutProps> = ({ keys, description }) => (
    <Box>
        <Text color="yellow">[{keys}]</Text>
        <Text dimColor> {description}</Text>
    </Box>
);

// Table header
interface TableHeaderProps {
    columns: { label: string; width?: number }[];
}

export const TableHeader: React.FC<TableHeaderProps> = ({ columns }) => (
    <Box>
        {columns.map((col, i) => (
            <Box key={i} width={col.width}>
                <Text bold dimColor>{col.label}</Text>
            </Box>
        ))}
    </Box>
);

// Divider
interface DividerProps {
    character?: string;
    color?: string;
}

export const Divider: React.FC<DividerProps> = ({ character = '─', color = 'gray' }) => (
    <Text color={color}>{character.repeat(60)}</Text>
);

// Truncate long text
export const truncate = (str: string, maxLength: number): string => {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
};

// Format timestamp
export const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
};
