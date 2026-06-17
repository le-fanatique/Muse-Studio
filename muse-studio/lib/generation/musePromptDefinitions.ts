// Static definitions for the editable Muse prompt overrides (Settings → Muse).
// No "use server" here — this file exports plain runtime constants/types,
// which a "use server" file (lib/actions/settings.ts) is not allowed to export.

export const MUSE_PROMPT_TASKS = [
  'character_visual_prompt',
  'character_brief_suggestion',
  'character_design_enhance',
  'visual_keyframe_prompt',
  'environment_brief_suggestion',
  'environment_design_enhance',
  'generate_storyline',
  'rewrite_scene',
  'write_scene_script',
  'refine_dialogue',
  'general_query',
  'visual_query',
  'motion_query',
] as const;

export type MusePromptTask = (typeof MUSE_PROMPT_TASKS)[number];

export type MusePromptSettings = Record<MusePromptTask, string | null>;
