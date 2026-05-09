# LocalCoach AI

LocalCoach AI is a free, open-source web app that turns a local AI model into practical coaching workflows for everyday work. It is designed for people who want private help with documents, messages, studying, translation, resume bullets, and brainstorming without paying for a cloud AI subscription.

LocalCoach AI does not sell or host models. You run a free local model runtime on your own computer, then LocalCoach AI gives it a friendly workflow interface.

## What Makes It Different

Most local AI tools focus on installing, downloading, or chatting with models. LocalCoach AI focuses on guided outcomes:

- Explain a document
- Draft an email or message
- Improve a resume bullet
- Study a topic
- Translate or simplify text
- Brainstorm ideas with tradeoffs and next steps

## Requirements

- A Windows, macOS, or Linux computer
- [Node.js](https://nodejs.org/) 20 or newer
- One free local model runtime:
  - [Ollama](https://ollama.com/) for the easiest start
  - [LM Studio](https://lmstudio.ai/) or another OpenAI-compatible local server

## One-Click Start

On Windows, double-click:

```text
START_LOCALCOACH_AI.cmd
```

The script checks Node.js, installs Ollama if needed, downloads `llama3.2:3b`, installs LocalCoach AI dependencies, starts the app, and opens your default browser.

On macOS or Linux, run:

```bash
bash scripts/start-localcoach.sh
```

If Node.js is not installed yet, install the LTS version from [nodejs.org](https://nodejs.org/) and run the script again.

## Manual Quick Start With Ollama

1. Install Node.js from [nodejs.org](https://nodejs.org/).
2. Install Ollama from [ollama.com](https://ollama.com/).
3. Download a small free model:

   ```bash
   ollama pull llama3.2:3b
   ```

4. Install LocalCoach AI:

   ```bash
   npm install
   ```

5. Copy the example settings:

   ```bash
   copy .env.example .env
   ```

   On macOS or Linux, use:

   ```bash
   cp .env.example .env
   ```

6. Start the app:

   ```bash
   npm run dev
   ```

7. Open the URL Vite prints in your terminal, usually `http://127.0.0.1:5173`.

## Using LM Studio Or Another Local Server

Set your `.env` file to:

```bash
LOCALCOACH_RUNTIME=openai-compatible
LOCALCOACH_BASE_URL=http://localhost:1234
LOCALCOACH_MODEL=your-local-model-name
LOCALCOACH_PORT=4317
```

In LM Studio, download a chat model and start the local server. LocalCoach AI will call `/v1/models` and `/v1/chat/completions` on that local server.

## Scripts

```bash
npm run dev       # Start backend API and frontend dev server
npm test          # Run automated tests
npm run build     # Type-check and build production frontend
npm run preview   # Preview the production build
```

## Privacy

LocalCoach AI sends prompts only to the runtime configured in your `.env` file. With Ollama or LM Studio running locally, your text stays on your machine.

## Troubleshooting

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for beginner-friendly fixes for runtime, model, memory, and setup issues.

## License

MIT
