'use server';

import { db } from '@/db';
import { encryptApiKey } from '@/lib/comfyui-crypto';
import { STORY_GENERATION_SYSTEM_PROMPTS } from '@/lib/generation/storyGenerationInternals';
import { MUSE_PROMPT_TASKS } from '@/lib/generation/musePromptDefinitions';
import type { MusePromptTask, MusePromptSettings } from '@/lib/generation/musePromptDefinitions';

interface SettingRow {
  key: string;
  value: string;
  updated_at: string;
}

// ─── Read ──────────────────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const row = db
    .prepare<[string], SettingRow>('SELECT * FROM settings WHERE key = ?')
    .get(key);
  return row?.value ?? null;
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = db.prepare<[], SettingRow>('SELECT * FROM settings').all();
  return Object.fromEntries(
    rows.filter((r) => r.key !== 'comfyui_api_key_enc').map((r) => [r.key, r.value]),
  );
}

// ─── Write ─────────────────────────────────────────────────────────────────────

export async function setSetting(key: string, value: string): Promise<void> {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(key, value, now);
}

export async function setSettings(entries: Record<string, string>): Promise<void> {
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO settings (key, value, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `);
  const txn = db.transaction(() => {
    for (const [key, value] of Object.entries(entries)) {
      stmt.run(key, value, now);
    }
  });
  txn();
}

// ─── LLM settings convenience helpers ────────────────────────────────────────

export interface LLMSettings {
  llmProvider: string;    // "ollama" | "openai" | "claude" | "lmstudio" | "openrouter"
  ollamaBaseUrl: string;
  ollamaModel: string;
  openaiModel: string;
  claudeModel: string;
  lmstudioBaseUrl: string;
  lmstudioModel: string;
  /** OpenRouter model id, e.g. openai/gpt-4o-mini */
  openrouterModel: string;
  /** OpenAI-compatible API base; default https://openrouter.ai/api/v1 */
  openrouterBaseUrl: string;
}

export async function getLLMSettings(): Promise<LLMSettings> {
  const all = await getAllSettings();
  return {
    llmProvider: all['llm_provider'] ?? 'ollama',
    ollamaBaseUrl: all['ollama_base_url'] ?? 'http://localhost:11434',
    ollamaModel: all['ollama_model'] ?? 'qwen3-vl:latest',
    openaiModel: all['openai_model'] ?? 'gpt-4o',
    claudeModel: all['claude_model'] ?? 'claude-sonnet-4-6',
    lmstudioBaseUrl: all['lmstudio_base_url'] ?? 'http://localhost:1234',
    lmstudioModel: all['lmstudio_model'] ?? '',
    openrouterModel: all['openrouter_model'] ?? 'openai/gpt-4o-mini',
    openrouterBaseUrl: all['openrouter_base_url'] ?? 'https://openrouter.ai/api/v1',
  };
}

export async function saveLLMSettings(data: LLMSettings): Promise<void> {
  await setSettings({
    llm_provider: data.llmProvider,
    ollama_base_url: data.ollamaBaseUrl,
    ollama_model: data.ollamaModel,
    openai_model: data.openaiModel,
    claude_model: data.claudeModel,
    lmstudio_base_url: data.lmstudioBaseUrl,
    lmstudio_model: data.lmstudioModel,
    openrouter_model: data.openrouterModel,
    openrouter_base_url: data.openrouterBaseUrl,
  });
}

// ─── Inference / Model settings ───────────────────────────────────────────────

export type FluxOffloadMode = 'none' | 'model' | 'sequential';

export interface InferenceSettings {
  fluxKleinOffload: FluxOffloadMode;
  videoDefault: string;  // maps to providers.video_default in muse_config.json
}

export async function getInferenceSettings(): Promise<InferenceSettings> {
  const all = await getAllSettings();
  return {
    fluxKleinOffload: (all['flux_klein_offload'] as FluxOffloadMode) ?? 'none',
    videoDefault: all['video_default'] ?? 'wan2.2',
  };
}

export async function saveInferenceSettings(data: InferenceSettings): Promise<void> {
  await setSettings({
    flux_klein_offload: data.fluxKleinOffload,
    video_default: data.videoDefault,
  });
}

// ─── Debug settings ───────────────────────────────────────────────────────────

export interface DebugSettings {
  logPrompts: boolean;  // mirrors debug.log_prompts in muse_config.local.json
}

export async function getDebugSettings(): Promise<DebugSettings> {
  const all = await getAllSettings();
  return {
    logPrompts: all['debug_log_prompts'] === 'true',
  };
}

export async function saveDebugSettings(data: DebugSettings): Promise<void> {
  await setSettings({
    debug_log_prompts: data.logPrompts ? 'true' : 'false',
  });
}

// ─── VRAM handoff settings ─────────────────────────────────────────────────────

export interface VRAMSettings {
  freeComfyUIBeforeLLM: boolean;
  unloadOllamaBeforeComfyUI: boolean;
}

export async function getVRAMSettings(): Promise<VRAMSettings> {
  const all = await getAllSettings();
  return {
    freeComfyUIBeforeLLM: all['vram_free_comfyui_before_llm'] === 'true',
    unloadOllamaBeforeComfyUI: all['vram_unload_ollama_before_comfyui'] === 'true',
  };
}

export async function saveVRAMSettings(data: VRAMSettings): Promise<void> {
  await setSettings({
    vram_free_comfyui_before_llm: data.freeComfyUIBeforeLLM ? 'true' : 'false',
    vram_unload_ollama_before_comfyui: data.unloadOllamaBeforeComfyUI ? 'true' : 'false',
  });
}

// ─── ComfyUI settings ─────────────────────────────────────────────────────────

export async function getComfyUIBaseUrl(): Promise<string> {
  return (await getSetting('comfyui_base_url')) ?? 'http://127.0.0.1:8188';
}

export async function hasComfyUIApiKey(): Promise<boolean> {
  return (await getSetting('comfyui_api_key_enc')) !== null;
}

export async function saveComfyUIApiKey(value: string): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('API key cannot be empty');
  await setSetting('comfyui_api_key_enc', encryptApiKey(trimmed));
}

export async function clearComfyUIApiKey(): Promise<void> {
  db.prepare("DELETE FROM settings WHERE key = 'comfyui_api_key_enc'").run();
}

// ─── Muse prompt overrides ─────────────────────────────────────────────────────
//
// User-editable overrides for a subset of STORY_GENERATION_SYSTEM_PROMPTS tasks
// (storyGenerationInternals.ts). Stored as `muse_prompt_<task>` keys in `settings`;
// absence of a key means "use the code default" (see route.ts resolution order).
// MUSE_PROMPT_TASKS and its types live in musePromptDefinitions.ts — a "use server"
// file can only export async functions, not runtime constants.

function musePromptSettingKey(task: MusePromptTask): string {
  return `muse_prompt_${task}`;
}

/** Returns the user override (if any) for each editable Muse prompt task, or null when unset. */
export async function getMusePromptSettings(): Promise<MusePromptSettings> {
  const all = await getAllSettings();
  return Object.fromEntries(
    MUSE_PROMPT_TASKS.map((task) => [task, all[musePromptSettingKey(task)] ?? null]),
  ) as MusePromptSettings;
}

/** Saves overrides for the given tasks. Pass null/empty to remove an override (revert to default). */
export async function saveMusePromptSettings(
  overrides: Partial<Record<MusePromptTask, string>>,
): Promise<void> {
  const toSet: Record<string, string> = {};
  const toDelete: MusePromptTask[] = [];

  for (const task of MUSE_PROMPT_TASKS) {
    if (!(task in overrides)) continue;
    const value = overrides[task];
    if (value && value.trim() && value.trim() !== STORY_GENERATION_SYSTEM_PROMPTS[task]) {
      toSet[musePromptSettingKey(task)] = value;
    } else {
      toDelete.push(task);
    }
  }

  if (Object.keys(toSet).length > 0) {
    await setSettings(toSet);
  }
  for (const task of toDelete) {
    db.prepare('DELETE FROM settings WHERE key = ?').run(musePromptSettingKey(task));
  }
}

/** Removes the override for a single Muse prompt task, reverting it to the code default. */
export async function resetMusePromptSetting(task: MusePromptTask): Promise<void> {
  db.prepare('DELETE FROM settings WHERE key = ?').run(musePromptSettingKey(task));
}

/** Removes all Muse prompt overrides, reverting every task to its code default. */
export async function resetAllMusePromptSettings(): Promise<void> {
  const txn = db.transaction(() => {
    for (const task of MUSE_PROMPT_TASKS) {
      db.prepare('DELETE FROM settings WHERE key = ?').run(musePromptSettingKey(task));
    }
  });
  txn();
}
