export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
  role: ChatRole;
  content: string;
  images?: string[];
};

export type Workflow = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  placeholder: string;
  icon: 'file' | 'message' | 'sparkles' | 'book' | 'languages' | 'lightbulb';
  systemFocus: string;
  userFrame: string;
};

export const workflows: Workflow[] = [
  {
    id: 'explain-document',
    title: 'Explain a document',
    shortTitle: 'Explain',
    description: 'Paste confusing text and get a plain-language explanation with next steps.',
    placeholder: 'Paste the document, policy, article, or note you want explained...',
    icon: 'file',
    systemFocus: 'Document explainer',
    userFrame: 'Explain this clearly, define hard terms, summarize the point, and list practical next steps.'
  },
  {
    id: 'draft-message',
    title: 'Draft an email or message',
    shortTitle: 'Draft',
    description: 'Turn rough thoughts into a clear message with the right tone.',
    placeholder: 'Describe who you are writing to, the goal, and any details to include...',
    icon: 'message',
    systemFocus: 'Message drafting coach',
    userFrame: 'Draft a concise message. Ask one clarifying question first only if an essential detail is missing.'
  },
  {
    id: 'resume-bullet',
    title: 'Improve a resume bullet',
    shortTitle: 'Resume',
    description: 'Rewrite experience into stronger, measurable resume bullets.',
    placeholder: 'Paste a rough bullet or describe the work you did...',
    icon: 'sparkles',
    systemFocus: 'Resume bullet improver',
    userFrame: 'Rewrite this into strong resume bullets. Preserve truth, avoid exaggeration, and suggest measurable variants.'
  },
  {
    id: 'study-helper',
    title: 'Study helper',
    shortTitle: 'Study',
    description: 'Get explanations, examples, flashcards, and a short practice quiz.',
    placeholder: 'Paste a topic, notes, or a question you are studying...',
    icon: 'book',
    systemFocus: 'Patient study coach',
    userFrame: 'Teach this step by step, then provide a few flashcards and a short quiz with answers.'
  },
  {
    id: 'translate-simplify',
    title: 'Translate or simplify text',
    shortTitle: 'Simplify',
    description: 'Make text easier to understand or translate it while preserving meaning.',
    placeholder: 'Paste text and say whether you want it simplified, translated, or both...',
    icon: 'languages',
    systemFocus: 'Translation and plain-language coach',
    userFrame: 'Preserve meaning, use clear language, and call out any phrase that may have multiple interpretations.'
  },
  {
    id: 'brainstorm',
    title: 'Brainstorm ideas',
    shortTitle: 'Brainstorm',
    description: 'Generate useful options, tradeoffs, and a practical first step.',
    placeholder: 'Describe what you are trying to create, decide, name, or improve...',
    icon: 'lightbulb',
    systemFocus: 'Practical brainstorming partner',
    userFrame: 'Generate distinct options, explain tradeoffs, recommend one, and give a concrete next step.'
  }
];

export function getWorkflow(workflowId: string): Workflow {
  const workflow = workflows.find((candidate) => candidate.id === workflowId);

  if (!workflow) {
    throw new Error(`Unknown workflow: ${workflowId}`);
  }

  return workflow;
}

export function buildCoachMessages(input: {
  workflowId: string;
  userText: string;
  attachmentContext?: string;
  images?: string[];
  history?: ChatMessage[];
}): ChatMessage[] {
  const workflow = getWorkflow(input.workflowId);
  const trimmedText = input.userText.trim();

  if (!trimmedText && !input.attachmentContext && !input.images?.length) {
    throw new Error('userText or attachment is required');
  }

  const attachmentSection = input.attachmentContext
    ? `\n\nAttached material:\n${input.attachmentContext.trim()}`
    : '';

  return [
    {
      role: 'system',
      content: [
        'You are LocalCoach AI, a private local AI coach for non-technical people.',
        `Current workflow: ${workflow.systemFocus}.`,
        'Be clear, kind, practical, and structured.',
        'Do not mention cloud services or paid APIs.',
        'When helpful, use short headings and bullets.'
      ].join(' ')
    },
    ...(input.history ?? []).filter((message) => message.role !== 'system'),
    {
      role: 'user',
      content: `${workflow.userFrame}${attachmentSection}\n\nUser input:\n${trimmedText || 'Please help with the attached material.'}`,
      images: input.images
    }
  ];
}
