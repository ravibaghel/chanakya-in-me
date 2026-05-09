import { Router } from 'express';
import { buildCoachMessages } from '../src/lib/workflows';
import type { RuntimeAdapter } from './runtimeAdapters';

export function createApiRouter(runtimeAdapter: RuntimeAdapter) {
  const router = Router();

  router.get('/runtimes/status', async (_request, response) => {
    const status = await runtimeAdapter.status();

    response.json({
      ...status,
      help: status.available
        ? undefined
        : 'Start your local model app, confirm the model is downloaded, then refresh LocalCoach AI.'
    });
  });

  router.get('/models', async (_request, response) => {
    try {
      const models = await runtimeAdapter.listModels();
      response.json({ models });
    } catch (error) {
      response.json({
        models: [],
        error: error instanceof Error ? error.message : 'Unable to list local models'
      });
    }
  });

  router.post('/chat', async (request, response) => {
    const { workflowId, userText, history } = request.body as {
      workflowId?: string;
      userText?: string;
      history?: Array<{ role: 'assistant' | 'user'; content: string }>;
    };

    if (!workflowId) {
      response.status(400).json({ error: 'workflowId is required' });
      return;
    }

    if (!userText?.trim()) {
      response.status(400).json({ error: 'userText is required' });
      return;
    }

    let messages;
    try {
      messages = buildCoachMessages({
        workflowId,
        userText,
        history: history ?? []
      });
    } catch (error) {
      response.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid workflow request'
      });
      return;
    }

    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.setHeader('Cache-Control', 'no-cache');

    try {
      for await (const chunk of runtimeAdapter.chat(messages)) {
        response.write(chunk);
      }
      response.end();
    } catch (error) {
      if (!response.headersSent) {
        response.status(503);
      }
      response.end(
        `\nLocalCoach could not reach your selected runtime. ${
          error instanceof Error ? error.message : 'Please check your local model server.'
        }`
      );
    }
  });

  return router;
}
