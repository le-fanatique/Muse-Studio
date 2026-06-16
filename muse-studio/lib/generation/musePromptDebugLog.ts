import { getSetting } from '@/lib/actions/settings';

/**
 * Shared "[MUSE PROMPT DEBUG]" console logger, gated by the debug_log_prompts
 * setting (Settings → LLM → Debug → "Log Muse prompts in server console").
 * Never pass API keys, tokens, or raw headers in `info` — only prompt text and
 * non-secret generation parameters.
 */
export interface MusePromptDebugInfo {
  flow: string;
  promptKey?: string;
  origin: string;
  provider: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt: string;
  userPrompt: string;
}

export async function logMusePromptDebug(info: MusePromptDebugInfo): Promise<void> {
  const enabled = (await getSetting('debug_log_prompts')) === 'true';
  if (!enabled) return;

  const meta = [
    `flow=${info.flow}`,
    info.promptKey ? `promptKey=${info.promptKey}` : null,
    `origin=${info.origin}`,
    `provider=${info.provider}`,
    `model=${info.model}`,
    info.temperature !== undefined ? `temperature=${info.temperature}` : null,
    info.maxTokens !== undefined ? `maxTokens=${info.maxTokens}` : null,
  ]
    .filter(Boolean)
    .join(' ');

  console.log(`[MUSE PROMPT DEBUG] ${meta}`);
  console.log(`[MUSE PROMPT DEBUG] system prompt:\n${info.systemPrompt}`);
  console.log(`[MUSE PROMPT DEBUG] user prompt:\n${info.userPrompt}`);
}
