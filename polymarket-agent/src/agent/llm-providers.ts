/**
 * LLM Provider Abstraction
 * Supports multiple local LLM backends
 */

export interface LLMModel {
    id: string;
    name: string;
    provider: string;
    size?: string;
    description?: string;
}

export interface LLMProvider {
    name: string;
    baseUrl: string;
    isAvailable: () => Promise<boolean>;
    listModels: () => Promise<LLMModel[]>;
    generate: (model: string, prompt: string, stream?: boolean) => Promise<string>;
    streamGenerate?: (model: string, prompt: string, onChunk: (text: string) => void) => Promise<string>;
}

// Ollama Provider (most common)
export class OllamaProvider implements LLMProvider {
    name = 'Ollama';
    baseUrl: string;

    constructor(baseUrl = 'http://localhost:11434') {
        this.baseUrl = baseUrl;
    }

    async isAvailable(): Promise<boolean> {
        try {
            const res = await fetch(`${this.baseUrl}/api/tags`, {
                signal: AbortSignal.timeout(2000)
            });
            return res.ok;
        } catch {
            return false;
        }
    }

    async listModels(): Promise<LLMModel[]> {
        try {
            const res = await fetch(`${this.baseUrl}/api/tags`);
            const data = await res.json() as { models: Array<{ name: string; size: number }> };
            return data.models.map(m => ({
                id: m.name,
                name: m.name.split(':')[0],
                provider: 'Ollama',
                size: `${(m.size / 1e9).toFixed(1)}GB`,
            }));
        } catch {
            return [];
        }
    }

    async generate(model: string, prompt: string): Promise<string> {
        const res = await fetch(`${this.baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt, stream: false }),
        });
        const data = await res.json() as { response: string };
        return data.response;
    }

    async streamGenerate(model: string, prompt: string, onChunk: (text: string) => void): Promise<string> {
        const res = await fetch(`${this.baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt, stream: true }),
        });

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        if (reader) {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(Boolean);

                for (const line of lines) {
                    try {
                        const json = JSON.parse(line) as { response: string };
                        if (json.response) {
                            fullResponse += json.response;
                            onChunk(json.response);
                        }
                    } catch { }
                }
            }
        }

        return fullResponse;
    }
}

// LM Studio Provider
export class LMStudioProvider implements LLMProvider {
    name = 'LM Studio';
    baseUrl: string;

    constructor(baseUrl = 'http://localhost:1234') {
        this.baseUrl = baseUrl;
    }

    async isAvailable(): Promise<boolean> {
        try {
            const res = await fetch(`${this.baseUrl}/v1/models`, {
                signal: AbortSignal.timeout(2000)
            });
            return res.ok;
        } catch {
            return false;
        }
    }

    async listModels(): Promise<LLMModel[]> {
        try {
            const res = await fetch(`${this.baseUrl}/v1/models`);
            const data = await res.json() as { data: Array<{ id: string }> };
            return data.data.map(m => ({
                id: m.id,
                name: m.id,
                provider: 'LM Studio',
            }));
        } catch {
            return [];
        }
    }

    async generate(model: string, prompt: string): Promise<string> {
        const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 1000,
            }),
        });
        const data = await res.json() as { choices: Array<{ message: { content: string } }> };
        return data.choices[0]?.message?.content || '';
    }
}

// GPT4All Provider
export class GPT4AllProvider implements LLMProvider {
    name = 'GPT4All';
    baseUrl: string;

    constructor(baseUrl = 'http://localhost:4891') {
        this.baseUrl = baseUrl;
    }

    async isAvailable(): Promise<boolean> {
        try {
            const res = await fetch(`${this.baseUrl}/v1/models`, {
                signal: AbortSignal.timeout(2000)
            });
            return res.ok;
        } catch {
            return false;
        }
    }

    async listModels(): Promise<LLMModel[]> {
        try {
            const res = await fetch(`${this.baseUrl}/v1/models`);
            const data = await res.json() as { data: Array<{ id: string }> };
            return data.data.map(m => ({
                id: m.id,
                name: m.id,
                provider: 'GPT4All',
            }));
        } catch {
            return [];
        }
    }

    async generate(model: string, prompt: string): Promise<string> {
        const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
            }),
        });
        const data = await res.json() as { choices: Array<{ message: { content: string } }> };
        return data.choices[0]?.message?.content || '';
    }
}

// Text Generation WebUI (Oobabooga)
export class OobaboogaProvider implements LLMProvider {
    name = 'Text Gen WebUI';
    baseUrl: string;

    constructor(baseUrl = 'http://localhost:5000') {
        this.baseUrl = baseUrl;
    }

    async isAvailable(): Promise<boolean> {
        try {
            const res = await fetch(`${this.baseUrl}/v1/models`, {
                signal: AbortSignal.timeout(2000)
            });
            return res.ok;
        } catch {
            return false;
        }
    }

    async listModels(): Promise<LLMModel[]> {
        try {
            const res = await fetch(`${this.baseUrl}/v1/models`);
            const data = await res.json() as { data: Array<{ id: string }> };
            return data.data.map(m => ({
                id: m.id,
                name: m.id,
                provider: 'Oobabooga',
            }));
        } catch {
            return [];
        }
    }

    async generate(model: string, prompt: string): Promise<string> {
        const res = await fetch(`${this.baseUrl}/v1/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, max_tokens: 1000 }),
        });
        const data = await res.json() as { choices: Array<{ text: string }> };
        return data.choices[0]?.text || '';
    }
}

// All supported providers
const ALL_PROVIDERS = [
    new OllamaProvider(),
    new LMStudioProvider(),
    new GPT4AllProvider(),
    new OobaboogaProvider(),
];

/**
 * Scan system for available LLM providers and models
 */
export async function scanForLLMs(): Promise<{ provider: LLMProvider; models: LLMModel[] }[]> {
    const results: { provider: LLMProvider; models: LLMModel[] }[] = [];

    await Promise.all(ALL_PROVIDERS.map(async (provider) => {
        if (await provider.isAvailable()) {
            const models = await provider.listModels();
            if (models.length > 0) {
                results.push({ provider, models });
            }
        }
    }));

    return results;
}

/**
 * Get a flat list of all available models
 */
export async function getAllAvailableModels(): Promise<LLMModel[]> {
    const providers = await scanForLLMs();
    return providers.flatMap(p => p.models);
}

/**
 * Get provider for a model
 */
export function getProviderForModel(modelId: string, providers: { provider: LLMProvider; models: LLMModel[] }[]): LLMProvider | null {
    for (const { provider, models } of providers) {
        if (models.some(m => m.id === modelId)) {
            return provider;
        }
    }
    return null;
}
