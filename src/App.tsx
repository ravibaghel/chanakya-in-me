import {
  BookOpen,
  FileUp,
  FileText,
  Image,
  Languages,
  Lightbulb,
  MessageSquareText,
  Paperclip,
  RefreshCw,
  Send,
  Sparkles
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  getAttachmentKind,
  type CoachAttachment
} from './lib/attachments';
import { hasImageAttachments, isVisionModel } from './lib/modelCapabilities';
import { getWorkflow, workflows, type Workflow } from './lib/workflows';

type RuntimeStatus = {
  available: boolean;
  runtime: 'ollama' | 'openai-compatible';
  baseUrl: string;
  model: string;
  help?: string;
};

type ChatEntry = {
  role: 'user' | 'assistant';
  content: string;
};

const icons = {
  file: FileText,
  message: MessageSquareText,
  sparkles: Sparkles,
  book: BookOpen,
  languages: Languages,
  lightbulb: Lightbulb
};

export default function App() {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(workflows[0].id);
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatus | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<CoachAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState('');
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const selectedWorkflow = useMemo(
    () => getWorkflow(selectedWorkflowId),
    [selectedWorkflowId]
  );
  const attachedImagesNeedVision =
    hasImageAttachments(attachments) && !isVisionModel(runtimeStatus?.model);
  const canAskCoach =
    !isLoading &&
    (input.trim().length > 0 || attachments.length > 0) &&
    !attachedImagesNeedVision;

  useEffect(() => {
    void refreshRuntime();
  }, []);

  async function refreshRuntime() {
    const [statusResponse, modelsResponse] = await Promise.all([
      fetch('/api/runtimes/status'),
      fetch('/api/models')
    ]);

    setRuntimeStatus((await statusResponse.json()) as RuntimeStatus);
    setModels(((await modelsResponse.json()) as { models?: string[] }).models ?? []);
  }

  async function askCoach(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = input.trim();
    if (!canAskCoach) return;

    const attachmentSummary =
      attachments.length > 0
        ? `\n\nAttached: ${attachments.map((attachment) => attachment.name).join(', ')}`
        : '';
    const nextChat: ChatEntry[] = [
      ...chat,
      { role: 'user', content: `${text || 'Please help with the attached material.'}${attachmentSummary}` }
    ];
    setChat(nextChat);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflowId: selectedWorkflowId,
        userText: text,
        attachments,
        history: chat.slice(-6)
      })
    });

    const answer = await response.text();
    setChat([...nextChat, { role: 'assistant', content: answer.trim() }]);
    setIsLoading(false);
  }

  async function addFiles(files: FileList | File[]) {
    setAttachmentError('');
    const incomingFiles = Array.from(files);
    const nextAttachments: CoachAttachment[] = [];

    for (const file of incomingFiles) {
      const kind = getAttachmentKind(file.name, file.type);
      if (!kind) {
        setAttachmentError(`${file.name} is not supported yet.`);
        continue;
      }

      if (kind === 'image') {
        nextAttachments.push({
          id: crypto.randomUUID(),
          name: file.name,
          kind,
          mimeType: file.type,
          dataUrl: await readFileAsDataUrl(file)
        });
        continue;
      }

      if (kind === 'text') {
        nextAttachments.push({
          id: crypto.randomUUID(),
          name: file.name,
          kind,
          mimeType: file.type || 'text/plain',
          text: await readFileAsText(file)
        });
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/attachments/extract', {
        method: 'POST',
        body: formData
      });
      const extracted = (await response.json()) as Omit<CoachAttachment, 'id'> & {
        error?: string;
      };

      if (!response.ok) {
        setAttachmentError(extracted.error ?? `Could not read ${file.name}.`);
        continue;
      }

      nextAttachments.push({
        id: crypto.randomUUID(),
        ...extracted
      });
    }

    setAttachments((current) => [...current, ...nextAttachments]);
  }

  function removeAttachment(id: string) {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }

  return (
    <main className="app-shell">
      <section className="sidebar" aria-label="Workflow selection">
        <div className="brand-lockup">
          <div className="brand-mark">
            <Sparkles aria-hidden="true" size={22} />
          </div>
          <div>
            <h1>LocalCoach AI</h1>
            <p>Private AI workflows on your own machine.</p>
          </div>
        </div>

        <div className="workflow-list">
          {workflows.map((workflow) => (
            <WorkflowButton
              key={workflow.id}
              workflow={workflow}
              selected={workflow.id === selectedWorkflowId}
              onSelect={() => setSelectedWorkflowId(workflow.id)}
            />
          ))}
        </div>
      </section>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="section-label">Everyday Productivity</p>
            <h2>{selectedWorkflow.title}</h2>
          </div>
          <RuntimePill
            status={runtimeStatus}
            modelCount={models.length}
            onRefresh={() => void refreshRuntime()}
          />
        </header>

        {runtimeStatus && !runtimeStatus.available ? (
          <div className="runtime-alert" role="status">
            <strong>Runtime needs attention</strong>
            <span>{runtimeStatus.help}</span>
          </div>
        ) : null}

        <section className="coach-panel" aria-label="Coach conversation">
          <div className="workflow-brief">
            <div className="brief-icon">{renderWorkflowIcon(selectedWorkflow)}</div>
            <div>
              <h3>{selectedWorkflow.shortTitle} coach</h3>
              <p>{selectedWorkflow.description}</p>
            </div>
          </div>

          <div className="conversation">
            {chat.length === 0 ? (
              <div className="empty-state">
                <Sparkles aria-hidden="true" size={34} />
                <p>Choose a workflow, paste what you need help with, and get a local response.</p>
              </div>
            ) : (
              chat.map((entry, index) => (
                <article className={`message ${entry.role}`} key={`${entry.role}-${index}`}>
                  <span>{entry.role === 'user' ? 'You' : 'LocalCoach'}</span>
                  <p>{entry.content}</p>
                </article>
              ))
            )}
            {isLoading ? <div className="thinking">LocalCoach is thinking locally...</div> : null}
          </div>

          <form className="composer" onSubmit={askCoach}>
            <label htmlFor="coach-input">What do you want help with?</label>
            <textarea
              id="coach-input"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onPaste={(event) => {
                if (event.clipboardData.files.length > 0) {
                  event.preventDefault();
                  void addFiles(event.clipboardData.files);
                }
              }}
              placeholder={selectedWorkflow.placeholder}
              rows={5}
            />
            <div className="attachment-bar">
              <label className="attach-button" htmlFor="attachment-input">
                <Paperclip aria-hidden="true" size={17} />
                Add screenshot or file
              </label>
              <input
                id="attachment-input"
                type="file"
                multiple
                accept="image/*,.txt,.md,.pdf,.docx"
                onChange={(event) => {
                  if (event.target.files) {
                    void addFiles(event.target.files);
                  }
                  event.currentTarget.value = '';
                }}
              />
              <span>Paste screenshots, or upload TXT, PDF, DOCX, PNG, JPG.</span>
            </div>
            {attachmentError ? <p className="attachment-error">{attachmentError}</p> : null}
            {attachedImagesNeedVision ? (
              <div className="vision-warning" role="alert">
                <strong>Screenshots need a vision model.</strong>
                <span>
                  Run <code>ollama pull llama3.2-vision:11b</code> and set{' '}
                  <code>LOCALCOACH_MODEL=llama3.2-vision:11b</code>, or use{' '}
                  <code>START_LOCALCOACH_AI_WITH_VISION.cmd</code>.
                </span>
              </div>
            ) : null}
            {attachments.length > 0 ? (
              <div className="attachment-list" aria-label="Attached files">
                {attachments.map((attachment) => (
                  <button
                    key={attachment.id}
                    type="button"
                    className="attachment-chip"
                    onClick={() => removeAttachment(attachment.id)}
                    title="Remove attachment"
                  >
                    {attachment.kind === 'image' ? (
                      <Image aria-hidden="true" size={16} />
                    ) : attachment.kind === 'pdf' || attachment.kind === 'word' ? (
                      <FileUp aria-hidden="true" size={16} />
                    ) : (
                      <FileText aria-hidden="true" size={16} />
                    )}
                    <span>{attachment.name}</span>
                  </button>
                ))}
              </div>
            ) : null}
            <button type="submit" disabled={!canAskCoach}>
              <Send aria-hidden="true" size={18} />
              Ask LocalCoach
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  if (typeof file.text === 'function') {
    return file.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function WorkflowButton({
  workflow,
  selected,
  onSelect
}: {
  workflow: Workflow;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`workflow-button ${selected ? 'selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      {renderWorkflowIcon(workflow)}
      <span>
        <strong>{workflow.title}</strong>
        <small>{workflow.description}</small>
      </span>
    </button>
  );
}

function RuntimePill({
  status,
  modelCount,
  onRefresh
}: {
  status: RuntimeStatus | null;
  modelCount: number;
  onRefresh: () => void;
}) {
  const runtimeName =
    status?.runtime === 'openai-compatible' ? 'Local server' : status?.runtime === 'ollama' ? 'Ollama' : 'Runtime';

  return (
    <div className={`runtime-pill ${status?.available ? 'ready' : 'offline'}`}>
      <div>
        <strong>
          {!status
            ? 'Checking runtime'
            : status.available
              ? `${runtimeName} ready`
              : 'Runtime offline'}
        </strong>
        <span>{status ? `${status.model} · ${modelCount} models` : 'Looking for local AI'}</span>
      </div>
      <button type="button" onClick={onRefresh} aria-label="Refresh runtime status">
        <RefreshCw aria-hidden="true" size={16} />
      </button>
    </div>
  );
}

function renderWorkflowIcon(workflow: Workflow) {
  const Icon = icons[workflow.icon];
  return <Icon aria-hidden="true" size={20} />;
}
