import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('one-click launcher scripts', () => {
  it('provides a Windows double-click entry point that delegates to PowerShell', () => {
    const script = readFileSync('START_LOCALCOACH_AI.cmd', 'utf8');

    expect(script).toContain('scripts\\start-localcoach.ps1');
    expect(script).toContain('-ExecutionPolicy Bypass');
  });

  it('installs or starts Ollama, pulls the default free model, starts the app, and opens the browser on Windows', () => {
    const script = readFileSync('scripts/start-localcoach.ps1', 'utf8');

    expect(script).toContain('OllamaSetup.exe');
    expect(script).toContain('"llama3.2:3b"');
    expect(script).toContain('ollama pull $ModelName');
    expect(script).toContain('npm install');
    expect(script).toContain('npm run dev');
    expect(script).toContain('Start-Process "http://127.0.0.1:5173"');
  });

  it('includes a macOS/Linux helper with the same model and browser launch behavior', () => {
    const script = readFileSync('scripts/start-localcoach.sh', 'utf8');

    expect(script).toContain('https://ollama.com/install.sh');
    expect(script).toContain('MODEL_NAME="llama3.2:3b"');
    expect(script).toContain('ollama pull $MODEL_NAME');
    expect(script).toContain('npm install');
    expect(script).toContain('npm run dev');
    expect(script).toContain('http://127.0.0.1:5173');
  });

  it('provides a Windows vision launcher that pulls the optional vision model', () => {
    const entrypoint = readFileSync('START_LOCALCOACH_AI_WITH_VISION.cmd', 'utf8');
    const script = readFileSync('scripts/start-localcoach.ps1', 'utf8');

    expect(entrypoint).toContain('-Vision');
    expect(script).toContain('llama3.2-vision:11b');
    expect(script).toContain('LOCALCOACH_MODEL=$ModelName');
  });

  it('provides a macOS/Linux vision flag that pulls the optional vision model', () => {
    const script = readFileSync('scripts/start-localcoach.sh', 'utf8');

    expect(script).toContain('--vision');
    expect(script).toContain('llama3.2-vision:11b');
    expect(script).toContain('LOCALCOACH_MODEL=$MODEL_NAME');
  });
});
