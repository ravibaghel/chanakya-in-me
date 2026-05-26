export type RuntimeName = 'ollama' | 'openai-compatible';

export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
  role: ChatRole;
  content: string;
  images?: string[];
};

export type RuntimeConfig = {
  runtime: RuntimeName;
  baseUrl: string;
  model: string;
};

export type RuntimeStatus = RuntimeConfig & {
  available: boolean;
  error?: string;
};

export type RuntimeAdapter = {
  status: () => Promise<RuntimeStatus>;
  listModels: () => Promise<string[]>;
  chat: (messages: ChatMessage[]) => AsyncGenerator<string>;
};

type FetchLike = typeof fetch;

export function createRuntimeAdapter(
  config: RuntimeConfig,
  fetchImpl: FetchLike = fetch
): RuntimeAdapter {
  if (config.runtime === 'ollama') {
    return createOllamaAdapter(config, fetchImpl);
  }

  return createOpenAiCompatibleAdapter(config, fetchImpl);
}

export function readRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const runtime = env.LOCALCOACH_RUNTIME === 'openai-compatible' ? 'openai-compatible' : 'ollama';

  return {
    runtime,
    baseUrl:
      env.LOCALCOACH_BASE_URL?.replace(/\/$/, '') ??
      (runtime === 'ollama' ? 'http://localhost:11434' : 'http://localhost:1234'),
    model: env.LOCALCOACH_MODEL ?? 'llama3.2:3b'
  };
}

function createOllamaAdapter(config: RuntimeConfig, fetchImpl: FetchLike): RuntimeAdapter {
  return {
    status: () => checkStatus(config, `${config.baseUrl}/api/tags`, fetchImpl),
    listModels: async () => {
      const response = await fetchWithTimeout(`${config.baseUrl}/api/tags`, fetchImpl);
      if (!response.ok) {
        throw new Error(`Ollama returned ${response.status}`);
      }

      const body = (await response.json()) as { models?: Array<{ name?: string }> };
      return (body.models ?? []).map((model) => model.name).filter(Boolean) as string[];
    },
    chat: async function* (messages) {
      const response = await fetchImpl(`${config.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages: messages.map((message) => ({
            role: message.role,
            content: message.content,
            ...(message.images?.length
              ? {
                  images: message.images.map((image) =>
                    image.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '')
                  )
                }
              : {})
          })),
          stream: true
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(`Ollama chat failed with status ${response.status}`);
      }

      for await (const line of readLines(response.body)) {
        if (!line.trim()) continue;
        const parsed = JSON.parse(line) as { message?: { content?: string }; response?: string };
        const content = parsed.message?.content ?? parsed.response;
        if (content) yield content;
      }
    }
  };
}

function createOpenAiCompatibleAdapter(config: RuntimeConfig, fetchImpl: FetchLike): RuntimeAdapter {
  return {
    status: () => checkStatus(config, `${config.baseUrl}/v1/models`, fetchImpl),
    listModels: async () => {
      const response = await fetchWithTimeout(`${config.baseUrl}/v1/models`, fetchImpl);
      if (!response.ok) {
        throw new Error(`Local OpenAI-compatible server returned ${response.status}`);
      }

      const body = (await response.json()) as { data?: Array<{ id?: string }> };
      return (body.data ?? []).map((model) => model.id).filter(Boolean) as string[];
    },
    chat: async function* (messages) {
      const response = await fetchImpl(`${config.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages: messages.map(toOpenAiMessage),
          stream: true
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(`Local OpenAI-compatible chat failed with status ${response.status}`);
      }

      for await (const line of readLines(response.body)) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const payload = trimmed.replace(/^data:\s*/, '');
        if (payload === '[DONE]') break;
        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield content;
      }
    }
  };
}

function toOpenAiMessage(message: ChatMessage) {
  if (!message.images?.length) {
    return {
      role: message.role,
      content: message.content
    };
  }

  return {
    role: message.role,
    content: [
      { type: 'text', text: message.content },
      ...message.images.map((image) => ({
        type: 'image_url',
        image_url: { url: image }
      }))
    ]
  };
}

async function checkStatus(
  config: RuntimeConfig,
  url: string,
  fetchImpl: FetchLike
): Promise<RuntimeStatus> {
  try {
    const response = await fetchWithTimeout(url, fetchImpl);

    return {
      available: response.ok,
      ...config,
      error: response.ok ? undefined : `Runtime returned ${response.status}`
    };
  } catch (error) {
    return {
      available: false,
      ...config,
      error: error instanceof Error ? error.message : 'Runtime is unreachable'
    };
  }
}

function fetchWithTimeout(url: string, fetchImpl: FetchLike) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);

  return fetchImpl(url, { signal: controller.signal }).finally(() => clearTimeout(timeout));
}

async function* readLines(stream: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      yield line;
    }
  }

  buffer += decoder.decode();
  if (buffer) {
    yield buffer;
  }
}
