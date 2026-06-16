'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, CheckCircle2, Save, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  saveMusePromptSettings,
  resetMusePromptSetting,
  resetAllMusePromptSettings,
} from '@/lib/actions/settings';
import { MUSE_PROMPT_TASKS } from '@/lib/generation/musePromptDefinitions';
import type { MusePromptSettings, MusePromptTask } from '@/lib/generation/musePromptDefinitions';
import { STORY_GENERATION_SYSTEM_PROMPTS } from '@/lib/generation/storyGenerationInternals';

interface MuseSettingsProps {
  initialOverrides: MusePromptSettings;
}

interface FieldSpec {
  task: MusePromptTask;
  label: string;
  note?: string;
}

interface SectionSpec {
  title: string;
  warning?: string;
  fields: FieldSpec[];
}

const SECTIONS: SectionSpec[] = [
  {
    title: 'Character',
    fields: [{ task: 'character_visual_prompt', label: 'Character visual prompt' }],
  },
  {
    title: 'Environment',
    fields: [
      {
        task: 'visual_keyframe_prompt',
        label: 'Environment visual prompt',
        note: 'Also used by Scene → Generate Image Prompt.',
      },
    ],
  },
  {
    title: 'Story',
    warning: 'Keep the expected section structure intact.',
    fields: [{ task: 'generate_storyline', label: 'Generate storyline' }],
  },
  {
    title: 'Scene',
    fields: [{ task: 'rewrite_scene', label: 'Rewrite scene' }],
  },
  {
    title: 'Ask Muse',
    fields: [
      { task: 'write_scene_script', label: 'Write scene script' },
      { task: 'refine_dialogue', label: 'Refine dialogue' },
      { task: 'general_query', label: 'General query' },
      { task: 'visual_query', label: 'Visual query' },
      { task: 'motion_query', label: 'Motion query' },
    ],
  },
];

export function MuseSettings({ initialOverrides }: MuseSettingsProps) {
  const router = useRouter();

  const [values, setValues] = useState<Record<MusePromptTask, string>>(() =>
    Object.fromEntries(
      MUSE_PROMPT_TASKS.map((task) => [
        task,
        initialOverrides[task] ?? STORY_GENERATION_SYSTEM_PROMPTS[task],
      ]),
    ) as Record<MusePromptTask, string>,
  );

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [confirmingRestoreAll, setConfirmingRestoreAll] = useState(false);

  const isOverridden = (task: MusePromptTask) =>
    values[task].trim() !== STORY_GENERATION_SYSTEM_PROMPTS[task].trim();

  const isDirty = MUSE_PROMPT_TASKS.some(
    (task) => values[task] !== (initialOverrides[task] ?? STORY_GENERATION_SYSTEM_PROMPTS[task]),
  );

  async function handleSave() {
    setSaving(true);
    try {
      await saveMusePromptSettings(values);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  async function handleRestoreDefault(task: MusePromptTask) {
    setValues((prev) => ({ ...prev, [task]: STORY_GENERATION_SYSTEM_PROMPTS[task] }));
    await resetMusePromptSetting(task);
    router.refresh();
  }

  async function handleRestoreAll() {
    setConfirmingRestoreAll(false);
    setValues(
      Object.fromEntries(
        MUSE_PROMPT_TASKS.map((task) => [task, STORY_GENERATION_SYSTEM_PROMPTS[task]]),
      ) as Record<MusePromptTask, string>,
    );
    await resetAllMusePromptSettings();
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/20 border border-violet-500/30">
              <Sparkles className="h-4 w-4 text-violet-400" />
            </div>
            <h1 className="text-lg font-semibold">Muse</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Override the system prompts used by Story Muse for select generation tasks. The
            production pipeline (Storyline → Script → Keyframe → Video) is unaffected — these
            overrides only change prompt text.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={!isDirty || saving}
          className={cn(
            'gap-2 h-9 px-4 font-medium transition-all',
            isDirty
              ? 'bg-violet-600 hover:bg-violet-500 text-white'
              : 'bg-white/5 text-muted-foreground border border-white/10 cursor-default',
          )}
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : saveSuccess ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save Changes
        </Button>
      </div>

      {SECTIONS.map((section) => (
        <section
          key={section.title}
          className="rounded-2xl border border-white/8 bg-[oklch(0.13_0.012_264)] p-5 space-y-5"
        >
          <h2 className="text-sm font-medium">{section.title}</h2>

          {section.warning && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              {section.warning}
            </p>
          )}

          {section.fields.map((field) => (
            <div key={field.task} className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="text-sm">{field.label}</p>
                  {isOverridden(field.task) && (
                    <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-300">
                      Custom
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  disabled={!isOverridden(field.task)}
                  onClick={() => handleRestoreDefault(field.task)}
                  className="h-7 gap-1 rounded-full text-[11px]"
                >
                  <RotateCcw className="h-3 w-3" />
                  Restore Default
                </Button>
              </div>
              {field.note && (
                <p className="text-xs text-muted-foreground/60">{field.note}</p>
              )}
              <Textarea
                value={values[field.task]}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [field.task]: e.target.value }))
                }
                rows={6}
                className="resize-y bg-black/20 border-white/10 text-xs font-mono"
              />
            </div>
          ))}
        </section>
      ))}

      <section className="rounded-2xl border border-white/8 bg-[oklch(0.13_0.012_264)] p-5 space-y-3">
        <h2 className="text-sm font-medium">Global</h2>
        {confirmingRestoreAll ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5">
            <p className="text-xs text-red-200">
              Restore all Muse prompts to their defaults? This removes every override.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                size="xs"
                onClick={handleRestoreAll}
                className="h-7 bg-red-600 text-[11px] hover:bg-red-500"
              >
                Restore All Defaults
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => setConfirmingRestoreAll(false)}
                className="h-7 gap-1 text-[11px]"
              >
                <X className="h-3 w-3" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setConfirmingRestoreAll(true)}
            className="h-8 gap-1.5 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restore All Defaults
          </Button>
        )}
      </section>
    </div>
  );
}
