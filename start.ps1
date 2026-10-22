$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

$runtimeRoot = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies'
$bundledNode = Join-Path $runtimeRoot 'node\bin'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    if (-not (Test-Path -LiteralPath (Join-Path $bundledNode 'node.exe'))) {
        throw 'Please install Node.js 20.19+ or 22.12+ and pnpm, then run this script again.'
    }
    $env:PATH = "$bundledNode;$env:PATH"
}

$pnpmCommand = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
if ($pnpmCommand) {
    $packageTool = $pnpmCommand.Source
} else {
    $packageTool = Join-Path $runtimeRoot 'bin\fallback\pnpm.cmd'
    if (-not (Test-Path -LiteralPath $packageTool)) {
        throw 'Please install pnpm (npm install -g pnpm), then run this script again.'
    }
}

if (-not (Test-Path -LiteralPath (Join-Path $PSScriptRoot 'node_modules\.modules.yaml'))) {
    & $packageTool install
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
}

& $packageTool run start
