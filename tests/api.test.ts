import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApiRouter } from '../server/api';
import type { RuntimeAdapter } from '../server/runtimeAdapters';

describe('localcoach api', () => {
  it('returns runtime status', async () => {
    const app = testApp(adapter({ available: true }));

    const response = await request(app).get('/api/runtimes/status').expect(200);

    expect(response.body).toEqual({
      available: true,
      runtime: 'ollama',
      baseUrl: 'http://localhost:11434',
      model: 'llama3.2:3b'
    });
  });

  it('returns a helpful status when the runtime is offline', async () => {
    const app = testApp(adapter({ available: false, error: 'connect ECONNREFUSED' }));

    const response = await request(app).get('/api/runtimes/status').expect(200);

    expect(response.body.available).toBe(false);
    expect(response.body.help).toContain('Start your local model app');
  });

  it('lists models from the selected runtime', async () => {
    const app = testApp(adapter({ models: ['llama3.2:3b'] }));

    const response = await request(app).get('/api/models').expect(200);

    expect(response.body).toEqual({ models: ['llama3.2:3b'] });
  });

  it('returns an empty model list instead of a browser error when listing fails', async () => {
    const brokenAdapter = adapter({});
    brokenAdapter.listModels = async () => {
      throw new Error('runtime offline');
    };
    const app = testApp(brokenAdapter);

    const response = await request(app).get('/api/models').expect(200);

    expect(response.body).toEqual({
      models: [],
      error: 'runtime offline'
    });
  });

  it('rejects chat requests without text', async () => {
    const app = testApp(adapter({}));

    const response = await request(app)
      .post('/api/chat')
      .send({ workflowId: 'brainstorm', userText: '' })
      .expect(400);

    expect(response.body.error).toContain('userText');
  });

  it('streams chat text from the selected runtime', async () => {
    const app = testApp(adapter({ chunks: ['First', ' second'] }));

    const response = await request(app)
      .post('/api/chat')
      .send({ workflowId: 'brainstorm', userText: 'Community project ideas' })
      .expect(200);

    expect(response.text).toBe('First second');
    expect(response.headers['content-type']).toContain('text/plain');
  });
});

function testApp(runtimeAdapter: RuntimeAdapter) {
  const app = express();
  app.use(express.json());
  app.use('/api', createApiRouter(runtimeAdapter));
  return app;
}

function adapter(options: {
  available?: boolean;
  error?: string;
  models?: string[];
  chunks?: string[];
}): RuntimeAdapter {
  return {
    status: async () => ({
      available: options.available ?? true,
      runtime: 'ollama',
      baseUrl: 'http://localhost:11434',
      model: 'llama3.2:3b',
      error: options.error
    }),
    listModels: async () => options.models ?? [],
    chat: async function* () {
      for (const chunk of options.chunks ?? []) {
        yield chunk;
      }
    }
  };
}
