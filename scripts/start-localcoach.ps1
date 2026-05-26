param(
  [switch]$Vision
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ModelName = if ($Vision) { "llama3.2-vision:11b" } else { "llama3.2:3b" }
$AppUrl = "http://127.0.0.1:5173"
$ApiUrl = "http://127.0.0.1:4317/api/runtimes/status"

function Write-Step($Message) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-Command($Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Wait-ForUrl($Url, $Label) {
  for ($Attempt = 1; $Attempt -le 60; $Attempt++) {
    try {
      Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2 | Out-Null
      return
    } catch {
      Start-Sleep -Seconds 1
    }
  }

  throw "$Label did not start at $Url"
}

function Get-OllamaCommand {
  $Existing = Get-Command ollama -ErrorAction SilentlyContinue
  if ($Existing) {
    return $Existing.Source
  }

  $CommonPath = Join-Path $env:LOCALAPPDATA "Programs\Ollama\ollama.exe"
  if (Test-Path $CommonPath) {
    return $CommonPath
  }

  return $null
}

Set-Location $ProjectRoot

Write-Step "Checking Node.js"
if (-not (Test-Command "node") -or -not (Test-Command "npm")) {
  Write-Host "Node.js and npm are required before LocalCoach AI can run."
  Write-Host "Opening the Node.js download page. Install the LTS version, then run this file again."
  Start-Process "https://nodejs.org/"
  exit 1
}

Write-Step "Checking Ollama"
$OllamaCommand = Get-OllamaCommand
if (-not $OllamaCommand) {
  if (Test-Command "winget") {
    Write-Step "Installing Ollama with winget"
    winget install Ollama.Ollama --exact --accept-package-agreements --accept-source-agreements
  } else {
    Write-Step "Downloading OllamaSetup.exe"
    $Installer = Join-Path $env:TEMP "OllamaSetup.exe"
    Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile $Installer
    Start-Process -FilePath $Installer -Wait
  }

  $OllamaCommand = Get-OllamaCommand
}

if (-not $OllamaCommand) {
  throw "Ollama installation finished, but the ollama command was not found. Restart your computer and run this file again."
}

Write-Step "Starting Ollama"
try {
  Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:11434/api/tags" -TimeoutSec 2 | Out-Null
} catch {
  Start-Process -WindowStyle Hidden -FilePath $OllamaCommand -ArgumentList "serve"
  Start-Sleep -Seconds 3
}

Write-Step "Downloading the selected free model"
$PullCommand = "ollama pull $ModelName"
Write-Host $PullCommand
& $OllamaCommand pull $ModelName

Write-Step "Preparing LocalCoach settings"
if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
}
$EnvContent = Get-Content ".env" -Raw
if ($EnvContent -match "LOCALCOACH_MODEL=") {
  $EnvContent = $EnvContent -replace "LOCALCOACH_MODEL=.*", "LOCALCOACH_MODEL=$ModelName"
} else {
  $EnvContent = "$EnvContent`nLOCALCOACH_MODEL=$ModelName"
}
Set-Content -Path ".env" -Value $EnvContent

Write-Step "Installing LocalCoach AI dependencies"
npm install

Write-Step "Starting LocalCoach AI"
Start-Process -WindowStyle Hidden -FilePath "powershell" -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", "cd '$ProjectRoot'; npm run dev"

Write-Step "Opening LocalCoach AI in your browser"
Wait-ForUrl $ApiUrl "LocalCoach API"
Wait-ForUrl $AppUrl "LocalCoach web app"
Start-Process "http://127.0.0.1:5173"

Write-Host ""
Write-Host "LocalCoach AI is running. Keep this window available for status messages." -ForegroundColor Green
