import mammoth from 'mammoth';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import type { AttachmentKind } from '../src/lib/attachments';

export async function extractTextFromUpload(input: {
  buffer: Buffer;
  kind: AttachmentKind;
  mimeType: string;
}): Promise<string> {
  if (input.kind === 'text') {
    return input.buffer.toString('utf8');
  }

  if (input.kind === 'pdf') {
    const result = await pdf(input.buffer);
    return result.text;
  }

  if (input.kind === 'word') {
    const result = await mammoth.extractRawText({ buffer: input.buffer });
    return result.value;
  }

  throw new Error(`Cannot extract text from ${input.mimeType}`);
}
