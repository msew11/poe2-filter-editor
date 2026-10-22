import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const env = { ...process.env }
const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path') ?? 'PATH'
const cargoBin = join(homedir(), '.cargo', 'bin')
env[pathKey] = `${cargoBin}${process.platform === 'win32' ? ';' : ':'}${env[pathKey] ?? ''}`

function fail(message) {
  console.error(message)
  process.exit(1)
}

if (spawnSync('cargo', ['--version'], { env, windowsHide: true }).status !== 0) {
  fail('未找到 Rust/Cargo。请先从 https://rustup.rs/ 安装 stable MSVC 工具链。')
}

if (process.platform === 'win32') {
  const vswhere = join(env['ProgramFiles(x86)'] ?? 'C:\\Program Files (x86)', 'Microsoft Visual Studio', 'Installer', 'vswhere.exe')
  const visualStudio = existsSync(vswhere) && spawnSync(vswhere, [
    '-latest', '-products', '*', '-requires', 'Microsoft.VisualStudio.Component.VC.Tools.x86.x64', '-property', 'installationPath',
  ], { encoding: 'utf8', windowsHide: true })
  if (!visualStudio || visualStudio.status !== 0 || !visualStudio.stdout.trim()) {
    fail('缺少 MSVC C++ 构建工具。请安装 Visual Studio 2022 Build Tools，勾选“使用 C++ 的桌面开发”（含 Windows SDK），然后重试。下载：https://aka.ms/vs/17/release/vs_BuildTools.exe')
  }
}

const result = spawnSync(process.execPath, [require.resolve('@tauri-apps/cli/tauri.js'), ...process.argv.slice(2)], {
  env, stdio: 'inherit',
})
if (result.error) fail(result.error.message)
process.exit(result.status ?? 1)
