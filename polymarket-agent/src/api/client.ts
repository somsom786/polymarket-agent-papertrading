/**
 * Polymarket CLOB API Client
 * Wrapper for read-only market data operations
 * Supports both binary (YES/NO) and multi-outcome markets
 */

import type {
    Market,
    OrderBook,
    EnrichedMarket,
    PolymarketEvent,
    EnrichedEvent,
    OutcomeWithPrice,
    EnrichedEventMarket
} from './types.js';

const DEFAULT_CLOB_URL = 'https://clob.polymarket.com';
const GAMMA_API_URL = 'https://gamma-api.polymarket.com';

// Gamma API market format
interface GammaMarket {
    id: string;
    question: string;
    conditionId: string;
    slug: string;
    endDate: string;
    description: string;
    outcomes: string;
    outcomePrices: string;
    volume: string;
    active: boolean;
    closed: boolean;
    marketType: string;
    category: string;
    clobTokenIds: string;
}

// Gamma API event format
interface GammaEvent {
    id: string;
    slug: string;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
    category: string;
    volume: string;
    liquidity: string;
    markets: GammaMarket[];
    closed: boolean;
}

export class PolymarketClient {
    private clobUrl: string;
    private gammaUrl: string;

    constructor(clobUrl?: string) {
        this.clobUrl = clobUrl || process.env.CLOB_API_URL || DEFAULT_CLOB_URL;
        this.gammaUrl = GAMMA_API_URL;
    }

    /**
     * Fetch markets from gamma API
     */
    async getMarketsFromGamma(options: {
        closed?: boolean;
        limit?: number;
        offset?: number;
    } = {}): Promise<GammaMarket[]> {
        const params = new URLSearchParams();
        params.set('closed', (options.closed ?? false).toString());
        params.set('limit', (options.limit ?? 100).toString());
        if (options.offset) {
            params.set('offset', options.offset.toString());
        }

        const url = `${this.gammaUrl}/markets?${params.toString()}`;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to fetch markets: ${response.status} ${response.statusText}`);
            }

            return await response.json() as GammaMarket[];
        } catch (error) {
            console.error('Gamma API Error:', error);
            throw error;
        }
    }

    /**
     * Fetch events from gamma API (for multi-outcome markets)
     */
    async getEventsFromGamma(options: {
        closed?: boolean;
        limit?: number;
        offset?: number;
    } = {}): Promise<GammaEvent[]> {
        const params = new URLSearchParams();
        params.set('closed', (options.closed ?? false).toString());
        params.set('limit', (options.limit ?? 100).toString());
        if (options.offset) {
            params.set('offset', options.offset.toString());
        }

        const url = `${this.gammaUrl}/events?${params.toString()}`;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to fetch events: ${response.status} ${response.statusText}`);
            }

            return await response.json() as GammaEvent[];
        } catch (error) {
            console.error('Gamma Events API Error:', error);
            throw error;
        }
    }

    /**
     * Convert gamma market to our Market format
     */
    private convertGammaToMarket(gm: GammaMarket): Market {
        let outcomes: string[] = [];
        let clobTokenIds: string[] = [];

        try {
            outcomes = JSON.parse(gm.outcomes || '["Yes", "No"]');
            clobTokenIds = JSON.parse(gm.clobTokenIds || '[]');
        } catch {
            outcomes = ['Yes', 'No'];
            clobTokenIds = [];
        }

        return {
            condition_id: gm.conditionId,
            question_id: gm.id,
            tokens: outcomes.map((outcome, i) => ({
                token_id: clobTokenIds[i] || `${gm.id}-${i}`,
                outcome,
            })),
            rewards: {
                min_size: 0,
                max_spread: 0,
                event_start_date: '',
                event_end_date: gm.endDate,
                in_game_multiplier: 1,
                reward_epoch: 0,
            },
            minimum_order_size: '1',
            minimum_tick_size: '0.01',
            category: gm.category || 'Other',
            end_date_iso: gm.endDate,
            game_start_time: '',
            question: gm.question,
            market_slug: gm.slug,
            min_incentive_size: '0',
            max_incentive_spread: '0',
            active: gm.active,
            closed: gm.closed,
            seconds_delay: 0,
            icon: '',
            fpmm: '',
        };
    }

    /**
     * Fetch all active markets using gamma API (binary markets only)
     */
    async getAllActiveMarkets(maxCount: number = 100): Promise<Market[]> {
        try {
            const gammaMarkets = await this.getMarketsFromGamma({
                closed: false,
                limit: maxCount
            });

            return gammaMarkets.map(gm => this.convertGammaToMarket(gm));
        } catch (error) {
            console.error('Error fetching active markets:', error);
            return [];
        }
    }

    /**
     * Get enriched markets from gamma with actual prices
     * Fetches ALL markets by paginating through the API
     */
    async getEnrichedMarketsFromGamma(maxMarkets: number = 1000): Promise<EnrichedMarket[]> {
        const allMarkets: EnrichedMarket[] = [];
        const batchSize = 100; // API limit per request
        let offset = 0;
        let hasMore = true;

        console.log(`Fetching all markets (up to ${maxMarkets})...`);

        while (hasMore && allMarkets.length < maxMarkets) {
            const gammaMarkets = await this.getMarketsFromGamma({
                closed: false,
                limit: batchSize,
                offset
            });

            if (gammaMarkets.length === 0) {
                hasMore = false;
                break;
            }

            for (const gm of gammaMarkets) {
                let prices: number[] = [0.5, 0.5];
                try {
                    prices = JSON.parse(gm.outcomePrices || '[0.5, 0.5]').map(Number);
                } catch {
                    prices = [0.5, 0.5];
                }

                const market = this.convertGammaToMarket(gm);

                allMarkets.push({
                    ...market,
                    yesPrice: prices[0] || 0.5,
                    noPrice: prices[1] || 0.5,
                    volume24h: Number(gm.volume) || 0,
                    isMultiOutcome: false,
                });
            }

            offset += batchSize;

            // If we got less than batchSize, there are no more
            if (gammaMarkets.length < batchSize) {
                hasMore = false;
            }

            // Small delay to avoid rate limiting
            if (hasMore) {
                await new Promise(r => setTimeout(r, 100));
            }
        }

        console.log(`Fetched ${allMarkets.length} markets total`);
        return allMarkets;
    }

    /**
     * Get enriched events (multi-outcome markets)
     * Fetches ALL events by paginating through the API
     */
    async getEnrichedEvents(maxEvents: number = 500): Promise<EnrichedEvent[]> {
        const allEvents: EnrichedEvent[] = [];
        const batchSize = 100;
        let offset = 0;
        let hasMore = true;

        console.log(`Fetching all events (up to ${maxEvents})...`);

        while (hasMore && allEvents.length < maxEvents) {
            const events = await this.getEventsFromGamma({
                closed: false,
                limit: batchSize,
                offset
            });

            if (events.length === 0) {
                hasMore = false;
                break;
            }

            for (const event of events) {
                const isMultiOutcome = event.markets.length > 1;
                const outcomes: OutcomeWithPrice[] = [];
                const enrichedMarkets: EnrichedEventMarket[] = [];

                for (const market of event.markets) {
                    let marketOutcomes: string[] = [];
                    let prices: number[] = [];
                    let tokenIds: string[] = [];

                    try {
                        marketOutcomes = JSON.parse(market.outcomes || '["Yes", "No"]');
                        prices = JSON.parse(market.outcomePrices || '[0.5, 0.5]').map(Number);
                        tokenIds = JSON.parse(market.clobTokenIds || '[]');
                    } catch {
                        marketOutcomes = ['Yes', 'No'];
                        prices = [0.5, 0.5];
                        tokenIds = [];
                    }

                    const isYesNo = marketOutcomes.length === 2 &&
                        marketOutcomes[0].toLowerCase() === 'yes';

                    if (isMultiOutcome) {
                        const outcomeName = market.question;
                        outcomes.push({
                            name: outcomeName,
                            tokenId: tokenIds[0] || market.id,
                            price: prices[0] || 0.5,
                            volume: Number(market.volume) || 0,
                        });
                    }

                    enrichedMarkets.push({
                        id: market.id,
                        question: market.question,
                        conditionId: market.conditionId,
                        tokenId: tokenIds[0] || market.id,
                        price: prices[0] || 0.5,
                        volume: Number(market.volume) || 0,
                        isYesNoMarket: isYesNo,
                    });
                }

                outcomes.sort((a, b) => b.price - a.price);

                allEvents.push({
                    id: event.id,
                    title: event.title,
                    category: event.category || 'Other',
                    endDate: event.endDate,
                    isClosed: event.closed,
                    isMultiOutcome,
                    outcomeCount: isMultiOutcome ? event.markets.length : 2,
                    totalVolume: Number(event.volume) || 0,
                    outcomes,
                    markets: enrichedMarkets,
                });
            }

            offset += batchSize;

            if (events.length < batchSize) {
                hasMore = false;
            }

            if (hasMore) {
                await new Promise(r => setTimeout(r, 100));
            }
        }

        console.log(`Fetched ${allEvents.length} events total`);
        return allEvents;
    }

    /**
     * Get combined view of all markets (both binary and multi-outcome)
     */
    async getAllEnrichedMarkets(binaryLimit: number = 30, eventLimit: number = 20): Promise<{
        binaryMarkets: EnrichedMarket[];
        multiOutcomeEvents: EnrichedEvent[];
    }> {
        const [binaryMarkets, events] = await Promise.all([
            this.getEnrichedMarketsFromGamma(binaryLimit),
            this.getEnrichedEvents(eventLimit),
        ]);

        // Filter to only multi-outcome events
        const multiOutcomeEvents = events.filter(e => e.isMultiOutcome);

        return {
            binaryMarkets,
            multiOutcomeEvents,
        };
    }

    /**
     * Get order book for a specific token (CLOB API)
     */
    async getOrderBook(tokenId: string): Promise<OrderBook> {
        const url = `${this.clobUrl}/book?token_id=${tokenId}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Failed to fetch order book: ${response.statusText}`);
        }

        return response.json() as Promise<OrderBook>;
    }

    /**
     * Get current price for a token from the order book
     */
    async getPrice(tokenId: string): Promise<number> {
        try {
            const orderBook = await this.getOrderBook(tokenId);

            const bestBid = orderBook.bids.length > 0 ? parseFloat(orderBook.bids[0].price) : 0;
            const bestAsk = orderBook.asks.length > 0 ? parseFloat(orderBook.asks[0].price) : 1;

            if (bestBid === 0 && bestAsk === 1) {
                return 0.5;
            }

            return (bestBid + bestAsk) / 2;
        } catch {
            return 0.5;
        }
    }

    /**
     * Get prices for multiple tokens
     */
    async getPrices(tokenIds: string[]): Promise<Map<string, number>> {
        const prices = new Map<string, number>();

        const batchSize = 10;
        for (let i = 0; i < tokenIds.length; i += batchSize) {
            const batch = tokenIds.slice(i, i + batchSize);
            const pricePromises = batch.map(async (id) => {
                const price = await this.getPrice(id);
                return { id, price };
            });

            const results = await Promise.all(pricePromises);
            results.forEach(({ id, price }) => prices.set(id, price));

            if (i + batchSize < tokenIds.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return prices;
    }

    /**
     * Get spread for a market
     */
    async getSpread(tokenId: string): Promise<{ bid: number; ask: number; spread: number }> {
        const orderBook = await this.getOrderBook(tokenId);

        const bestBid = orderBook.bids.length > 0 ? parseFloat(orderBook.bids[0].price) : 0;
        const bestAsk = orderBook.asks.length > 0 ? parseFloat(orderBook.asks[0].price) : 1;

        return {
            bid: bestBid,
            ask: bestAsk,
            spread: bestAsk - bestBid,
        };
    }
}

// Singleton instance
let clientInstance: PolymarketClient | null = null;

export function getClient(): PolymarketClient {
    if (!clientInstance) {
        clientInstance = new PolymarketClient();
    }
    return clientInstance;
}
