/**
 * Polymarket Paper Trading Agent
 * Main Entry Point
 */

import 'dotenv/config';
import React from 'react';
import { render } from 'ink';
import { App } from './ui/app.js';
import { PortfolioManager } from './engine/portfolio.js';
import { TradingAgent } from './agent/agent.js';
import type { StrategyType } from './agent/types.js';

// Configuration from environment
const config = {
    initialBalance: Number(process.env.INITIAL_BALANCE) || 100000,
    maxPositionSize: Number(process.env.MAX_POSITION_SIZE) || 10000,
    maxPositions: Number(process.env.MAX_POSITIONS) || 10,
    strategy: (process.env.AGENT_STRATEGY || 'balanced') as StrategyType,
    autoTrade: process.env.AUTO_TRADE === 'true',
    tradeIntervalMs: Number(process.env.TRADE_INTERVAL_MS) || 60000,
};

// Initialize core components
const portfolio = new PortfolioManager(config.initialBalance);
const agent = new TradingAgent(portfolio, {
    strategy: config.strategy,
    maxPositionSize: config.maxPositionSize,
    maxPositions: config.maxPositions,
    minConfidence: 0.5,
    autoTrade: config.autoTrade,
    tradeIntervalMs: config.tradeIntervalMs,
});

// Start the terminal UI
console.clear();
console.log('🚀 Starting Polymarket Paper Trading Agent...\n');

const { waitUntilExit } = render(
    <App portfolio={portfolio} agent={agent} />
);

// Handle graceful shutdown
process.on('SIGINT', () => {
    agent.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    agent.stop();
    process.exit(0);
});

// Wait for app to exit
waitUntilExit().then(() => {
    console.log('\n👋 Goodbye! Thanks for using Polymarket Paper Trading Agent.\n');
    process.exit(0);
});
