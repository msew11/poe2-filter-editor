export interface DesktopDirectory { kind: 'desktop'; name: string; path: string }

export function isDesktop() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function desktopCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core')
  try { return await invoke<T>(command, args) }
  catch (error) { throw error instanceof Error ? error : new Error(String(error)) }
}

export async function saveDesktopFilter(filename: string, source: string) {
  if (!await desktopCommand<boolean>('save_filter', { filename, source })) {
    throw new DOMException('已取消保存。', 'AbortError')
  }
}
