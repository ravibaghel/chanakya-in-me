import { describe, expect, it } from 'vitest';
import { hasImageAttachments, isVisionModel } from '../src/lib/modelCapabilities';

describe('model capabilities', () => {
  it('treats llama3.2:3b as text-only', () => {
    expect(isVisionModel('llama3.2:3b')).toBe(false);
  });

  it('treats models with vision in the name as image-capable', () => {
    expect(isVisionModel('llama3.2-vision:11b')).toBe(true);
    expect(isVisionModel('my-local-VISION-model')).toBe(true);
  });

  it('detects image attachments separately from text documents', () => {
    expect(
      hasImageAttachments([
        { id: '1', name: 'notes.txt', kind: 'text', mimeType: 'text/plain' },
        { id: '2', name: 'screen.png', kind: 'image', mimeType: 'image/png' }
      ])
    ).toBe(true);

    expect(
      hasImageAttachments([
        { id: '1', name: 'notes.txt', kind: 'text', mimeType: 'text/plain' }
      ])
    ).toBe(false);
  });
});
