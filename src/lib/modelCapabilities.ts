import type { CoachAttachment } from './attachments';

export function isVisionModel(modelName: string | undefined): boolean {
  return modelName?.toLowerCase().includes('vision') ?? false;
}

export function hasImageAttachments(attachments: CoachAttachment[]): boolean {
  return attachments.some((attachment) => attachment.kind === 'image');
}
