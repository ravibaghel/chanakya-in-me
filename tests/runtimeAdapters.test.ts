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

  it('sends image attachments to Ollama using message images', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"message":{"content":"ok"}}\n'));
    const adapter = createRuntimeAdapter(config('ollama'), fetchMock);

    for await (const _chunk of adapter.chat([
      {
        role: 'user',
        content: 'What is on this screen?',
        images: ['abc123']
      }
    ])) {
      // drain stream
    }

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.messages[0].images).toEqual(['abc123']);
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

  it('sends image attachments to OpenAI-compatible local servers as image_url parts', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('data: {"choices":[{"delta":{"content":"ok"}}]}\n\ndata: [DONE]\n')
    );
    const adapter = createRuntimeAdapter(config('openai-compatible'), fetchMock);

    for await (const _chunk of adapter.chat([
      {
        role: 'user',
        content: 'What is on this screen?',
        images: ['data:image/png;base64,abc123']
      }
    ])) {
      // drain stream
    }

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body.messages[0].content).toEqual([
      { type: 'text', text: 'What is on this screen?' },
      { type: 'image_url', image_url: { url: 'data:image/png;base64,abc123' } }
    ]);
  });
});

function config(runtime: RuntimeConfig['runtime']): RuntimeConfig {
  return {
    runtime,
    baseUrl: 'http://local.test',
    model: 'tiny'
  };
}
