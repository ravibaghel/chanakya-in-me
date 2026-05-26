import { Router } from 'express';
import multer from 'multer';
import {
  buildAttachmentContext,
  getAttachmentKind,
  getImagePayloads,
  type CoachAttachment
} from '../src/lib/attachments';
import { buildCoachMessages } from '../src/lib/workflows';
import { extractTextFromUpload } from './extractAttachments';
import type { RuntimeAdapter } from './runtimeAdapters';

export function createApiRouter(runtimeAdapter: RuntimeAdapter) {
  const router = Router();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024
    }
  });

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
    const { workflowId, userText, history, attachments } = request.body as {
      workflowId?: string;
      userText?: string;
      attachments?: CoachAttachment[];
      history?: Array<{ role: 'assistant' | 'user'; content: string }>;
    };

    if (!workflowId) {
      response.status(400).json({ error: 'workflowId is required' });
      return;
    }

    if (!userText?.trim() && !attachments?.length) {
      response.status(400).json({ error: 'userText or attachment is required' });
      return;
    }

    let messages;
    try {
      messages = buildCoachMessages({
        workflowId,
        userText: userText ?? '',
        attachmentContext: buildAttachmentContext(attachments ?? []),
        images: getImagePayloads(attachments ?? []),
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

  router.post('/attachments/extract', upload.single('file'), async (request, response) => {
    if (!request.file) {
      response.status(400).json({ error: 'file is required' });
      return;
    }

    const kind = getAttachmentKind(request.file.originalname, request.file.mimetype);
    if (!kind) {
      response.status(400).json({ error: 'Unsupported file type' });
      return;
    }

    if (kind === 'image') {
      response.json({
        name: request.file.originalname,
        kind,
        mimeType: request.file.mimetype
      });
      return;
    }

    try {
      response.json({
        name: request.file.originalname,
        kind,
        mimeType: request.file.mimetype,
        text: await extractTextFromUpload({
          buffer: request.file.buffer,
          kind,
          mimeType: request.file.mimetype
        })
      });
    } catch (error) {
      response.status(422).json({
        error: error instanceof Error ? error.message : 'Unable to extract text'
      });
    }
  });

  return router;
}
