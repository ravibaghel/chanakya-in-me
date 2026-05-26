import { describe, expect, it } from 'vitest';
import {
  buildAttachmentContext,
  getAttachmentKind,
  type CoachAttachment
} from '../src/lib/attachments';

describe('attachments', () => {
  it('recognizes supported text, document, and image file types', () => {
    expect(getAttachmentKind('notes.txt', 'text/plain')).toBe('text');
    expect(getAttachmentKind('paper.pdf', 'application/pdf')).toBe('pdf');
    expect(getAttachmentKind('resume.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('word');
    expect(getAttachmentKind('screen.png', 'image/png')).toBe('image');
  });

  it('formats extracted text attachments into coach context', () => {
    const attachments: CoachAttachment[] = [
      {
        id: 'a1',
        name: 'notes.txt',
        kind: 'text',
        mimeType: 'text/plain',
        text: 'Remember the project goal.'
      },
      {
        id: 'a2',
        name: 'screen.png',
        kind: 'image',
        mimeType: 'image/png',
        dataUrl: 'data:image/png;base64,abc'
      }
    ];

    expect(buildAttachmentContext(attachments)).toContain('notes.txt');
    expect(buildAttachmentContext(attachments)).toContain('Remember the project goal.');
    expect(buildAttachmentContext(attachments)).toContain('Image attached: screen.png');
  });
});
