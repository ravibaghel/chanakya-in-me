#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODEL_NAME="llama3.2:3b"
if [ "${1:-}" = "--vision" ]; then
  MODEL_NAME="llama3.2-vision:11b"
fi
APP_URL="http://127.0.0.1:5173"
API_URL="http://127.0.0.1:4317/api/runtimes/status"

cd "$PROJECT_ROOT"

step() {
  printf "\n==> %s\n" "$1"
}

wait_for_url() {
  local url="$1"
  local label="$2"
  for _ in $(seq 1 60); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  printf "%s did not start at %s\n" "$label" "$url" >&2
  exit 1
}

open_browser() {
  if command -v open >/dev/null 2>&1; then
    open "$APP_URL"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$APP_URL"
  else
    printf "Open %s in your browser.\n" "$APP_URL"
  fi
}

step "Checking Node.js"
if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  printf "Node.js and npm are required. Install the LTS version from https://nodejs.org/ and run this script again.\n" >&2
  exit 1
fi

step "Checking Ollama"
if ! command -v ollama >/dev/null 2>&1; then
  printf "Installing Ollama from https://ollama.com/install.sh\n"
  curl -fsSL https://ollama.com/install.sh | sh
fi

step "Starting Ollama"
if ! curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  (ollama serve >/tmp/localcoach-ollama.log 2>&1 &)
  sleep 3
fi

step "Downloading the selected free model"
echo "ollama pull $MODEL_NAME"
ollama pull "$MODEL_NAME"

step "Preparing LocalCoach settings"
if [ ! -f .env ]; then
  cp .env.example .env
fi
if grep -q '^LOCALCOACH_MODEL=' .env; then
  node -e "const fs=require('fs'); const file='.env'; const model=process.argv[1]; fs.writeFileSync(file, fs.readFileSync(file,'utf8').replace(/^LOCALCOACH_MODEL=.*$/m, 'LOCALCOACH_MODEL='+model));" "$MODEL_NAME"
else
  printf "\nLOCALCOACH_MODEL=$MODEL_NAME\n" >> .env
fi

step "Installing LocalCoach AI dependencies"
npm install

step "Starting LocalCoach AI"
(npm run dev >/tmp/localcoach-ai.log 2>&1 &)

step "Opening LocalCoach AI in your browser"
wait_for_url "$API_URL" "LocalCoach API"
wait_for_url "$APP_URL" "LocalCoach web app"
open_browser

printf "\nLocalCoach AI is running at %s\n" "$APP_URL"
