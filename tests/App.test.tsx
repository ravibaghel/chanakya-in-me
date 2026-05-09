import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App';

describe('LocalCoach AI app', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows workflow cards and runtime status', async () => {
    mockFetch({
      '/api/runtimes/status': {
        available: true,
        runtime: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'llama3.2:3b'
      },
      '/api/models': { models: ['llama3.2:3b'] }
    });

    render(<App />);

    expect(await screen.findByText('LocalCoach AI')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Explain a document/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Draft an email or message/i })).toBeInTheDocument();
    expect(await screen.findByText('Ollama ready')).toBeInTheDocument();
  });

  it('selects a workflow and streams a coach response', async () => {
    mockFetch({
      '/api/runtimes/status': {
        available: true,
        runtime: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'llama3.2:3b'
      },
      '/api/models': { models: ['llama3.2:3b'] },
      '/api/chat': 'Try these three angles.'
    });

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: /Brainstorm ideas/i }));
    fireEvent.change(screen.getByLabelText('What do you want help with?'), {
      target: { value: 'Open source project ideas' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ask LocalCoach' }));

    await waitFor(() =>
      expect(screen.getByText('Try these three angles.')).toBeInTheDocument()
    );
  });

  it('shows a beginner-friendly offline message', async () => {
    mockFetch({
      '/api/runtimes/status': {
        available: false,
        runtime: 'ollama',
        baseUrl: 'http://localhost:11434',
        model: 'llama3.2:3b',
        help: 'Start your local model app, then refresh.'
      },
      '/api/models': { models: [] }
    });

    render(<App />);

    expect(await screen.findByText('Runtime needs attention')).toBeInTheDocument();
    expect(screen.getByText('Start your local model app, then refresh.')).toBeInTheDocument();
  });
});

function mockFetch(routes: Record<string, unknown>) {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const path = new URL(url, 'http://localhost').pathname;
    const value = routes[path];

    if (typeof value === 'string') {
      return new Response(value, { status: 200 });
    }

    return Response.json(value ?? {}, { status: 200 });
  });
}
