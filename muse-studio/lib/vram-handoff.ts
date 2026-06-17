const VRAM_TIMEOUT_MS = 3000;

export async function freeComfyUIBeforeLLM(comfyBaseUrl: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VRAM_TIMEOUT_MS);
  try {
    await fetch(`${comfyBaseUrl}/free`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ unload_models: true, free_memory: true }),
      signal: controller.signal,
    });
  } catch (err) {
    console.warn('[vram-handoff] freeComfyUIBeforeLLM failed:', err instanceof Error ? err.message : String(err));
  } finally {
    clearTimeout(timer);
  }
}

export async function unloadOllamaBeforeComfyUI(ollamaBaseUrl: string, model: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), VRAM_TIMEOUT_MS);
  try {
    await fetch(`${ollamaBaseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [], keep_alive: 0 }),
      signal: controller.signal,
    });
  } catch (err) {
    console.warn('[vram-handoff] unloadOllamaBeforeComfyUI failed:', err instanceof Error ? err.message : String(err));
  } finally {
    clearTimeout(timer);
  }
}
