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
- Paste screenshots or upload images for vision-capable local models
- Upload TXT, PDF, or DOCX files so LocalCoach can use their text as context

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

For screenshot questions, double-click:

```text
START_LOCALCOACH_AI_WITH_VISION.cmd
```

That optional launcher downloads `llama3.2-vision:11b` and updates `.env` so images can be understood locally.

On macOS or Linux, run:

```bash
bash scripts/start-localcoach.sh
```

For screenshot questions on macOS or Linux, run:

```bash
bash scripts/start-localcoach.sh --vision
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
LOCALCOACH_CHAT_TIMEOUT_MS=120000
```

In LM Studio, download a chat model and start the local server. LocalCoach AI will call `/v1/models` and `/v1/chat/completions` on that local server.

## Screenshots And Files

You can paste screenshots directly into the message box, or use **Add screenshot or file** to upload:

- Images: PNG, JPG, GIF, WebP
- Documents: TXT, Markdown, PDF, DOCX

TXT, PDF, and DOCX files are read locally by the LocalCoach API and sent to your selected model as text context. Images are sent to the model as image attachments, so screenshot questions require a local vision model such as `llama3.2-vision:11b` or another vision-capable Ollama/LM Studio model. If you attach a screenshot while using `llama3.2:3b`, LocalCoach will show a warning and wait until you switch to a vision model.

For image questions with Ollama, update `.env`:

```bash
LOCALCOACH_MODEL=llama3.2-vision:11b
```

Then download the model:

```bash
ollama pull llama3.2-vision:11b
```

Vision models are much larger than the default text model. If a screenshot question keeps thinking for a long time, LocalCoach stops waiting after `LOCALCOACH_CHAT_TIMEOUT_MS` and shows a local-machine guidance message instead of silently hanging.

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
