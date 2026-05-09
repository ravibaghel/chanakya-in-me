import {
  BookOpen,
  FileText,
  Languages,
  Lightbulb,
  MessageSquareText,
  RefreshCw,
  Send,
  Sparkles
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
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
  const [chat, setChat] = useState<ChatEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const selectedWorkflow = useMemo(
    () => getWorkflow(selectedWorkflowId),
    [selectedWorkflowId]
  );

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
    if (!text || isLoading) return;

    const nextChat: ChatEntry[] = [...chat, { role: 'user', content: text }];
    setChat(nextChat);
    setInput('');
    setIsLoading(true);

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflowId: selectedWorkflowId,
        userText: text,
        history: chat.slice(-6)
      })
    });

    const answer = await response.text();
    setChat([...nextChat, { role: 'assistant', content: answer.trim() }]);
    setIsLoading(false);
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
              placeholder={selectedWorkflow.placeholder}
              rows={5}
            />
            <button type="submit" disabled={!input.trim() || isLoading}>
              <Send aria-hidden="true" size={18} />
              Ask LocalCoach
            </button>
          </form>
        </section>
      </section>
    </main>
  );
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
