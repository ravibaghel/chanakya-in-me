# Troubleshooting LocalCoach AI

This guide is written for non-technical users. Try the matching fix, then refresh LocalCoach AI in your browser.

## LocalCoach Says The Runtime Needs Attention

Your local model app is probably not running.

For Ollama:

```bash
ollama list
```

If that command works, Ollama is installed. If it does not, install Ollama from [ollama.com](https://ollama.com/).

For LM Studio:

1. Open LM Studio.
2. Go to the local server screen.
3. Start the server.
4. Confirm the server URL matches `LOCALCOACH_BASE_URL` in `.env`.

## Model Not Found

The model name in `.env` must match a model installed in your local runtime.

For Ollama:

```bash
ollama list
```

If you do not have a model yet, try:

```bash
ollama pull llama3.2:3b
```

Then set:

```bash
LOCALCOACH_MODEL=llama3.2:3b
```

## The App Is Slow

Local AI speed depends on your computer. Smaller models are usually better for older laptops.

Try:

```bash
ollama pull llama3.2:3b
```

Avoid very large models unless your computer has enough memory.

## Out Of Memory Or Crashes

Use a smaller model. A 3B model is a safer first choice than a 7B, 13B, or larger model.

Also close other heavy apps before running a local model.

## Browser Opens But Chat Does Not Respond

Check both pieces are running:

- Frontend: Vite usually runs at `http://127.0.0.1:5173`
- Backend: LocalCoach API runs at `http://127.0.0.1:4317`

Run:

```bash
npm run dev
```

Keep that terminal open while using LocalCoach AI.

## Change From Ollama To LM Studio

Edit `.env`:

```bash
LOCALCOACH_RUNTIME=openai-compatible
LOCALCOACH_BASE_URL=http://localhost:1234
LOCALCOACH_MODEL=your-local-model-name
```

Then stop and restart:

```bash
npm run dev
```
