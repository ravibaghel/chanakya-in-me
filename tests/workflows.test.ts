import { describe, expect, it } from 'vitest';
import { buildCoachMessages, workflows } from '../src/lib/workflows';

describe('workflow prompt builders', () => {
  it('exposes the six everyday productivity workflows', () => {
    expect(workflows.map((workflow) => workflow.id)).toEqual([
      'explain-document',
      'draft-message',
      'resume-bullet',
      'study-helper',
      'translate-simplify',
      'brainstorm'
    ]);
  });

  it('wraps user input with coach instructions and selected workflow context', () => {
    const messages = buildCoachMessages({
      workflowId: 'resume-bullet',
      userText: 'Owned onboarding for a classroom app.',
      history: [{ role: 'assistant', content: 'Share the raw bullet.' }]
    });

    expect(messages).toEqual([
      expect.objectContaining({
        role: 'system',
        content: expect.stringContaining('LocalCoach AI')
      }),
      { role: 'assistant', content: 'Share the raw bullet.' },
      {
        role: 'user',
        content: expect.stringContaining('Owned onboarding for a classroom app.')
      }
    ]);
    expect(messages[0].content).toContain('Resume bullet improver');
  });

  it('includes attachment context when present', () => {
    const messages = buildCoachMessages({
      workflowId: 'explain-document',
      userText: 'What are the main risks?',
      attachmentContext: 'Attached file: policy.txt\nPolicy text here.',
      history: []
    });

    expect(messages[1].content).toContain('Attached material:');
    expect(messages[1].content).toContain('Policy text here.');
  });

  it('rejects unknown workflow ids before a runtime call is made', () => {
    expect(() =>
      buildCoachMessages({
        workflowId: 'not-real',
        userText: 'hello',
        history: []
      })
    ).toThrow('Unknown workflow');
  });
});
