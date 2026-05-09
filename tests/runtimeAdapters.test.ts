import { describe, expect, it, vi } from 'vitest';
import {
  createRuntimeAdapter,
  type ChatMessage,
  type RuntimeConfig
} from '../server/runtimeAdapters';

const messages: ChatMessage[] = [{ role: 'user', content: 'Hello' }];

describe('runtime adapters', () => {
  it('checks Ollama availability using the configured base url', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    const adapter = createRuntimeAdapter(config('ollama'), fetchMock);

    await expect(adapter.status()).resolves.toEqual({
      available: true,
      runtime: 'ollama',
      baseUrl: 'http://local.test',
      model: 'tiny'
    });
    expect(fetchMock).toHaveBeenCalledWith('http://local.test/api/tags', {
      signal: expect.any(AbortSignal)
    });
  });

  it('lists Ollama models from the tags endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        models: [{ name: 'llama3.2:3b' }, { name: 'mistral:7b' }]
      })
    );
    const adapter = createRuntimeAdapter(config('ollama'), fetchMock);

    await expect(adapter.listModels()).resolves.toEqual(['llama3.2:3b', 'mistral:7b']);
  });

  it('streams Ollama response chunks as plain text', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        '{"message":{"content":"Hello"}}\n{"message":{"content":" there"}}\n'
      )
    );
    const adapter = createRuntimeAdapter(config('ollama'), fetchMock);
    const chunks: string[] = [];

    for await (const chunk of adapter.chat(messages)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual(['Hello', ' there']);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://local.test/api/chat',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    );
  });

  it('uses OpenAI-compatible endpoints for local servers like LM Studio', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        data: [{ id: 'local-model' }]
      })
    );
    const adapter = createRuntimeAdapter(config('openai-compatible'), fetchMock);

    await expect(adapter.listModels()).resolves.toEqual(['local-model']);
    expect(fetchMock).toHaveBeenCalledWith('http://local.test/v1/models', {
      signal: expect.any(AbortSignal)
    });
  });
});

function config(runtime: RuntimeConfig['runtime']): RuntimeConfig {
  return {
    runtime,
    baseUrl: 'http://local.test',
    model: 'tiny'
  };
}
