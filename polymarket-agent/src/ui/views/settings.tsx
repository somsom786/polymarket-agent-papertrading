/**
 * Settings View - Configuration
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Panel, Currency } from '../components.js';
import { useStore } from '../store.js';

interface SettingRowProps {
    label: string;
    value: string | number;
    hint?: string;
}

const SettingRow: React.FC<SettingRowProps> = ({ label, value, hint }) => (
    <Box paddingY={0}>
        <Box width={25}>
            <Text>{label}</Text>
        </Box>
        <Box width={20}>
            <Text color="cyan" bold>{value}</Text>
        </Box>
        {hint && <Text dimColor>{hint}</Text>}
    </Box>
);

export const SettingsView: React.FC = () => {
    const { portfolio, strategy } = useStore();

    const initialBalance = portfolio?.totalValue
        ? portfolio.totalValue - portfolio.totalPnL
        : 100000;

    return (
        <Box flexDirection="column" padding={1}>
            {/* Agent Settings */}
            <Panel title="🤖 Agent Settings" borderColor="cyan">
                <Box flexDirection="column">
                    <SettingRow
                        label="Trading Strategy"
                        value={strategy}
                        hint="Press 1-5 in Agent view to change"
                    />
                    <SettingRow
                        label="Auto-Trade"
                        value="Disabled"
                        hint="Enable with [T] in Agent view"
                    />
                    <SettingRow
                        label="Trade Interval"
                        value="60s"
                        hint="Time between analysis cycles"
                    />
                    <SettingRow
                        label="Min Confidence"
                        value="50%"
                        hint="Minimum confidence to trade"
                    />
                </Box>
            </Panel>

            {/* Risk Settings */}
            <Box marginTop={1}>
                <Panel title="⚠️ Risk Management" borderColor="yellow">
                    <Box flexDirection="column">
                        <SettingRow
                            label="Max Position Size"
                            value="$10,000"
                            hint="Maximum $ per position"
                        />
                        <SettingRow
                            label="Max Positions"
                            value="10"
                            hint="Maximum open positions"
                        />
                        <SettingRow
                            label="Take Profit"
                            value="+50%"
                            hint="Auto-sell at this gain"
                        />
                        <SettingRow
                            label="Stop Loss"
                            value="-30%"
                            hint="Auto-sell at this loss"
                        />
                    </Box>
                </Panel>
            </Box>

            {/* Portfolio Settings */}
            <Box marginTop={1}>
                <Panel title="💰 Portfolio Settings" borderColor="green">
                    <Box flexDirection="column">
                        <SettingRow
                            label="Initial Balance"
                            value={`$${initialBalance.toLocaleString()}`}
                            hint="Starting paper money"
                        />
                        <SettingRow
                            label="Fee Rate"
                            value="0.1%"
                            hint="Simulated trading fees"
                        />
                        <Box marginTop={1}>
                            <Text dimColor>Press </Text>
                            <Text color="red">[X]</Text>
                            <Text dimColor> in Portfolio view to reset to initial balance</Text>
                        </Box>
                    </Box>
                </Panel>
            </Box>

            {/* API Settings */}
            <Box marginTop={1}>
                <Panel title="🌐 API Settings" borderColor="gray">
                    <Box flexDirection="column">
                        <SettingRow
                            label="API URL"
                            value="clob.polymarket.com"
                            hint="Polymarket CLOB API"
                        />
                        <SettingRow
                            label="Rate Limit"
                            value="10 req/s"
                            hint="Max API requests"
                        />
                        <Box marginTop={1}>
                            <Text dimColor>Read-only access - no API key required</Text>
                        </Box>
                    </Box>
                </Panel>
            </Box>

            {/* Help */}
            <Box marginTop={1} paddingX={1}>
                <Text dimColor>
                    Settings are configured via environment variables. See .env file for options.
                </Text>
            </Box>
        </Box>
    );
};
