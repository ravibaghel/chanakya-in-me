export type AttachmentKind = 'text' | 'pdf' | 'word' | 'image';

export type CoachAttachment = {
  id: string;
  name: string;
  kind: AttachmentKind;
  mimeType: string;
  text?: string;
  dataUrl?: string;
};

const wordMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export function getAttachmentKind(fileName: string, mimeType: string): AttachmentKind | null {
  const lowerName = fileName.toLowerCase();

  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf' || lowerName.endsWith('.pdf')) return 'pdf';
  if (mimeType === wordMimeType || lowerName.endsWith('.docx')) return 'word';
  if (mimeType.startsWith('text/') || lowerName.endsWith('.txt') || lowerName.endsWith('.md')) {
    return 'text';
  }

  return null;
}

export function buildAttachmentContext(attachments: CoachAttachment[]): string {
  const sections = attachments.map((attachment) => {
    if (attachment.kind === 'image') {
      return `Image attached: ${attachment.name}. Use a vision-capable local model to inspect it.`;
    }

    return [
      `Attached file: ${attachment.name}`,
      attachment.text?.trim() || '(No readable text was extracted.)'
    ].join('\n');
  });

  return sections.join('\n\n---\n\n');
}

export function getImagePayloads(attachments: CoachAttachment[]): string[] {
  return attachments
    .filter((attachment) => attachment.kind === 'image' && attachment.dataUrl)
    .map((attachment) => attachment.dataUrl as string);
}
