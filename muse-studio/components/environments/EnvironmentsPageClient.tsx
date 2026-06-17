'use client';

import React, { useState, useTransition } from 'react';
import { MapPin, Loader2, Sparkles, FileImage, Wand2, PenLine, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ManualImageUploadButton } from '@/components/media/ManualImageUploadButton';
import type { Environment, EnvironmentImage, StorylineContent } from '@/lib/types';
import type { LLMSettings } from '@/lib/actions/settings';
import type { ComfyWorkflowSummary } from '@/lib/actions/comfyui';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useStoryMuse } from '@/hooks/useStoryMuse';
import {
  createEnvironment,
  updateEnvironment,
  deleteEnvironment,
  addEnvironmentImage,
  deleteEnvironmentImage,
} from '@/lib/actions/environments';
import { EnvironmentComfyGenerateDialog } from '@/components/environments/EnvironmentComfyGenerateDialog';

const NO_TYPE_LABEL = 'No type';

function parseBriefSuggestion(text: string): { description: string; designNotes: string } {
  const descMatch = /DESCRIPTION:\s*([\s\S]*?)(?=DESIGN_NOTES:|$)/i.exec(text);
  const notesMatch = /DESIGN_NOTES:\s*([\s\S]*?)$/i.exec(text);
  return {
    description: descMatch?.[1]?.trim() ?? '',
    designNotes: notesMatch?.[1]?.trim() ?? '',
  };
}

function groupEnvironmentsByType(environments: Environment[]): Record<string, Environment[]> {
  const map: Record<string, Environment[]> = {};
  for (const e of environments) {
    const type = (e.environmentType?.trim() || NO_TYPE_LABEL) as string;
    if (!map[type]) map[type] = [];
    map[type].push(e);
  }

  const sortedKeys = Object.keys(map).sort((a, b) => {
    if (a === NO_TYPE_LABEL) return 1;
    if (b === NO_TYPE_LABEL) return -1;
    return a.localeCompare(b);
  });

  const result: Record<string, Environment[]> = {};
  for (const k of sortedKeys) result[k] = map[k];
  return result;
}

interface EnvironmentsPageClientProps {
  projectId: string;
  projectTitle: string;
  initialEnvironments: Environment[];
  llmSettings: LLMSettings;
  storyline?: StorylineContent;
  comfyImageWorkflows: ComfyWorkflowSummary[];
}

export function EnvironmentsPageClient({
  projectId,
  projectTitle,
  initialEnvironments,
  llmSettings,
  storyline,
  comfyImageWorkflows,
}: EnvironmentsPageClientProps) {
  const [environments, setEnvironments] = useState<Environment[]>(initialEnvironments);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (!initialEnvironments.length) return null;
    const sorted = [...initialEnvironments].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
    );
    return sorted[0]?.id ?? null;
  });

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [environmentType, setEnvironmentType] = useState('');
  const [description, setDescription] = useState('');
  const [designNotes, setDesignNotes] = useState('');

  const storyMuse = useStoryMuse();
  const [promptPendingId, setPromptPendingId] = useState<string | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageTargetId, setImageTargetId] = useState<string | null>(null);
  const [wbPending, setWbPending] = useState<{ id: string; action: 'suggest' | 'enhance' } | null>(null);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const selectedEnvironment = selectedId
    ? (environments.find((e) => e.id === selectedId) ?? null)
    : null;

  const grouped = groupEnvironmentsByType(environments);

  function resetForm() {
    setName('');
    setEnvironmentType('');
    setDescription('');
    setDesignNotes('');
    setError(null);
  }

  async function handleCreateEnvironment(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    startTransition(async () => {
      try {
        const created = await createEnvironment({
          projectId,
          name: name.trim(),
          environmentType: environmentType.trim() || undefined,
          description: description.trim() || undefined,
          designNotes: designNotes.trim() || undefined,
          sortOrder: environments.length,
        });
        setEnvironments((prev: Environment[]) => [...prev, created]);
        resetForm();
        setSelectedId(created.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create environment.');
      }
    });
  }

  async function handleDeleteEnvironment(envId: string) {
    if (!window.confirm('Delete this environment?')) return;
    startTransition(async () => {
      try {
        await deleteEnvironment(envId);
        setEnvironments((prev: Environment[]) => prev.filter((e: Environment) => e.id !== envId));
        if (selectedId === envId) setSelectedId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete environment.');
      }
    });
  }

  return (
    <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 flex flex-col border-r border-white/8 bg-[oklch(0.12_0.01_264)]">
        <div className="p-3 border-b border-white/8">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
            Type · Environment list
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/60">
            {projectTitle}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {environments.length === 0 ? (
            <p className="text-xs text-muted-foreground/70 p-2">
              No environments yet. Create one in the main area.
            </p>
          ) : (
            Object.entries(grouped).map(([type, list]) => (
              <div key={type} className="mb-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-violet-400/90 px-2 mb-1.5">
                  {type}
                </p>

                <ul className="space-y-0.5">
                  {list.map((env) => (
                    <li key={env.id}>
                      <button
                        type="button"
                        onClick={() => { setSelectedId(env.id); setIsEditingDetails(false); }}
                        className={cn(
                          'w-full text-left rounded-lg px-2.5 py-2 text-xs transition-colors',
                          selectedId === env.id
                            ? 'bg-violet-500/20 text-violet-200 border border-violet-500/30'
                            : 'text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent',
                        )}
                      >
                        <span className="font-medium truncate block">{env.name}</span>
                        {env.environmentType && env.environmentType !== type && (
                          <span className="text-[10px] text-muted-foreground/60 truncate block">
                            {env.environmentType}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 overflow-y-auto flex flex-col">
        <div className="p-5 max-w-3xl">
          {!selectedEnvironment ? (
            /* Create form */
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20">
                  <MapPin className="h-4 w-4 text-violet-300" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">New Environment</h2>
                  <p className="text-xs text-muted-foreground/70">
                    Add a location or setting for this project.
                  </p>
                </div>
              </div>

              <form onSubmit={handleCreateEnvironment} className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Neo-Tokyo Alley"
                    disabled={isPending}
                    className={cn(
                      'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs',
                      'placeholder:text-muted-foreground/50 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/25',
                    )}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                    Type
                  </label>
                  <input
                    type="text"
                    value={environmentType}
                    onChange={(e) => setEnvironmentType(e.target.value)}
                    placeholder="e.g. INT., EXT., Urban, Sci-Fi"
                    disabled={isPending}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs placeholder:text-muted-foreground/50 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/25"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                    Description
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    disabled={isPending}
                    placeholder="One or two sentences describing this location."
                    className="resize-none bg-white/5 border-white/10 text-xs placeholder:text-muted-foreground/50 focus:border-violet-500/50"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                    Design Notes
                  </label>
                  <Textarea
                    value={designNotes}
                    onChange={(e) => setDesignNotes(e.target.value)}
                    rows={3}
                    disabled={isPending}
                    placeholder="Visual anchors: palette, lighting, atmosphere, props…"
                    className="resize-none bg-white/5 border-white/10 text-xs placeholder:text-muted-foreground/50 focus:border-violet-500/50"
                  />
                </div>

                {error && (
                  <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  size="sm"
                  disabled={!name.trim() || isPending}
                  className="h-8 gap-1.5 bg-violet-600 text-xs hover:bg-violet-500"
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <MapPin className="h-3.5 w-3.5" />
                  )}
                  Add Environment
                </Button>
              </form>
            </div>
          ) : (
            /* Detail view */
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/20">
                    <MapPin className="h-4 w-4 text-violet-300" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold">{selectedEnvironment.name}</h2>
                    {selectedEnvironment.environmentType && (
                      <p className="text-xs text-muted-foreground/70">
                        {selectedEnvironment.environmentType}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isEditingDetails && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5"
                      onClick={() => startEditDetails(selectedEnvironment)}
                    >
                      <Pencil className="h-3 w-3" />
                      Edit details
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => { setSelectedId(null); setIsEditingDetails(false); }}
                  >
                    New environment
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    disabled={isPending}
                    onClick={() => handleDeleteEnvironment(selectedEnvironment.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {isEditingDetails ? (
                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                      Description
                    </label>
                    <Textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={3}
                      className="resize-none bg-white/5 border-white/10 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                      Design Notes
                    </label>
                    <Textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={4}
                      className="resize-none bg-white/5 border-white/10 text-xs"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 gap-1.5 bg-violet-600 text-xs hover:bg-violet-500"
                      onClick={() => handleSaveDetails(selectedEnvironment)}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setIsEditingDetails(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {selectedEnvironment.description && (
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground mb-1">Description</p>
                      <p className="text-xs text-foreground/90">{selectedEnvironment.description}</p>
                    </div>
                  )}
                  {selectedEnvironment.designNotes && (
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground mb-1">Design Notes</p>
                      <p className="text-xs text-foreground/90 whitespace-pre-wrap">
                        {selectedEnvironment.designNotes}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* World-building AI actions */}
              {!isEditingDetails && (
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          disabled={!!wbPending || storyMuse.isGenerating}
                          onClick={() => handleSuggestFromStory(selectedEnvironment)}
                          className="h-7 gap-1 rounded-full border-violet-500/40 bg-violet-500/10 text-[11px] text-violet-100 hover:bg-violet-500/20"
                        >
                          {wbPending?.id === selectedEnvironment.id && wbPending.action === 'suggest' ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Wand2 className="h-3 w-3" />
                          )}
                          Suggest from Story
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Suggests a description and design notes from the project storyline. Existing filled fields are preserved.
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          disabled={!selectedEnvironment.designNotes?.trim() || !!wbPending || storyMuse.isGenerating}
                          onClick={() => handleEnhanceDecorBrief(selectedEnvironment)}
                          className="h-7 gap-1 rounded-full border-violet-500/40 bg-violet-500/10 text-[11px] text-violet-100 hover:bg-violet-500/20"
                        >
                          {wbPending?.id === selectedEnvironment.id && wbPending.action === 'enhance' ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <PenLine className="h-3 w-3" />
                          )}
                          Enhance Environment Brief
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      Expands the current environment brief into a richer visual direction. This replaces Design Notes.
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}

              {/* Prompt positive */}
              <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium text-muted-foreground/80">
                      Visual prompt (positive)
                    </p>

                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      disabled={promptPendingId === selectedEnvironment.id || storyMuse.isGenerating}
                      onClick={() => handleGeneratePrompt(selectedEnvironment)}
                      className="h-7 gap-1 rounded-full border-violet-500/40 bg-violet-500/10 text-[11px] text-violet-100 hover:bg-violet-500/20"
                    >
                      {promptPendingId === selectedEnvironment.id || storyMuse.isGenerating ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Sparkles className="h-3 w-3" />
                      )}
                      Muse prompt
                    </Button>
                  </div>
                  <Textarea
                    value={selectedEnvironment.promptPositive ?? ''}
                    onChange={(e) => {
                      const next = environments.map((env: Environment) =>
                        env.id === selectedEnvironment.id
                          ? { ...env, promptPositive: e.target.value }
                          : env,
                      );
                      setEnvironments(next);
                    }}
                    onBlur={() => {
                      const current = environments.find((e: Environment) => e.id === selectedEnvironment.id);
                      if (current?.promptPositive !== undefined) {
                        updateEnvironment(selectedEnvironment.id, {
                          promptPositive: current.promptPositive,
                        }).catch(() => setError('Failed to save prompt.'));
                      }
                    }}
                    rows={4}
                    placeholder="Describe the visual atmosphere of this environment for AI generation."
                    className="resize-none bg-black/20 border-white/10 text-xs placeholder:text-muted-foreground/40"
                  />
              </div>

              {/* Prompt negative */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-medium text-muted-foreground/80">
                  Visual prompt (negative)
                </p>
                <Textarea
                  value={selectedEnvironment.promptNegative ?? ''}
                  onChange={(e) => {
                    const next = environments.map((env: Environment) =>
                      env.id === selectedEnvironment.id
                        ? { ...env, promptNegative: e.target.value }
                        : env,
                    );
                    setEnvironments(next);
                  }}
                  onBlur={() => {
                    const current = environments.find((e: Environment) => e.id === selectedEnvironment.id);
                    if (current?.promptNegative !== undefined) {
                      updateEnvironment(selectedEnvironment.id, {
                        promptNegative: current.promptNegative,
                      }).catch(() => setError('Failed to save negative prompt.'));
                    }
                  }}
                  rows={2}
                  placeholder="Elements to exclude from generation."
                  className="resize-none bg-black/20 border-white/10 text-xs placeholder:text-muted-foreground/40"
                />
              </div>

              {/* Reference images */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium text-muted-foreground/75">
                    Reference images
                  </p>

                  <ManualImageUploadButton
                    sceneId={`environment-${selectedEnvironment.id}`}
                    label="Upload image"
                    onUploaded={async (rawPath) => {
                      const imagePath = rawPath.startsWith('/api/outputs/')
                        ? rawPath.replace('/api/outputs/', '')
                        : rawPath;

                      const image = await addEnvironmentImage({
                        environmentId: selectedEnvironment.id,
                        imagePath,
                        kind: 'ESTABLISHING',
                        source: 'UPLOAD',
                        notes: null,
                      });

                      setEnvironments((prev: Environment[]) =>
                        prev.map((env: Environment) =>
                          env.id === selectedEnvironment.id
                            ? { ...env, images: [...(env.images ?? []), image] }
                            : env,
                        ),
                      );
                    }}
                  />
                </div>

                {selectedEnvironment.images && selectedEnvironment.images.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedEnvironment.images.map((img: any) => (
                      <div
                        key={img.id}
                        className="group relative h-16 w-16 overflow-hidden rounded-md border border-white/10 bg-black/40"
                        title={img.kind.toLowerCase()}
                      >
                        <button
                          type="button"
                          className="h-full w-full"
                          onClick={() => {
                            if (img.image?.url) {
                              window.open(img.image.url, '_blank', 'noreferrer');
                            }
                          }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.image?.url}
                            alt={img.kind}
                            className="h-full w-full object-cover"
                          />
                        </button>

                        <button
                          type="button"
                          className="absolute right-1 top-1 rounded bg-red-500/80 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={async () => {
                            await deleteEnvironmentImage(img.id);

                            setEnvironments((prev: Environment[]) =>
                              prev.map((env: Environment) =>
                                env.id === selectedEnvironment.id
                                  ? {
                                      ...env,
                                      images: (env.images ?? []).filter((i: any) => i.id !== img.id),
                                    }
                                  : env,
                              ),
                            );
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground/50">
                    No reference image yet.
                  </p>
                )}
              </div>

              {comfyImageWorkflows.length > 0 && (
                <div className="flex items-center justify-between gap-2 pt-2">
                  <p className="text-[11px] text-muted-foreground/70">
                    Generate environment image with ComfyUI.
                  </p>

                  <Button
                    type="button"
                    size="xs"
                    variant="outline"
                    className="h-7 rounded-full border-violet-500/40 bg-violet-500/10 text-[11px] text-violet-100 hover:bg-violet-500/20"
                    disabled={!selectedEnvironment.promptPositive?.trim()}
                    onClick={() => {
                      setImageTargetId(selectedEnvironment.id);
                      setImageDialogOpen(true);
                    }}
                  >
                    <FileImage className="mr-1 h-3 w-3" />
                    Generate image
                  </Button>
                </div>
              )}

              {error && (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
      </main>

      <EnvironmentComfyGenerateDialog
        open={imageDialogOpen}
        onClose={() => setImageDialogOpen(false)}
        environment={environments.find((e) => e.id === imageTargetId) ?? null}
        comfyImageWorkflows={comfyImageWorkflows}
        onImageAttached={(image) => {
          setEnvironments((prev) =>
            prev.map((e) =>
              e.id === image.environmentId ? { ...e, images: [...(e.images ?? []), image] } : e,
            ),
          );
        }}
      />
    </div>
  );

  async function handleGeneratePrompt(env: Environment) {
    if (promptPendingId) return;
    setPromptPendingId(env.id);

    const pieces: string[] = [];
    pieces.push(
      'Create a single rich visual description for this film environment that can be used as an AI image prompt.',
    );
    pieces.push('');
    pieces.push(`Environment name: ${env.name}`);
    if (env.environmentType) pieces.push(`Type: ${env.environmentType}`);
    if (env.description) pieces.push(`Description: ${env.description}`);
    if (env.designNotes) pieces.push(`Design notes: ${env.designNotes}`);
    if (env.tags?.length) pieces.push(`Tags: ${env.tags.join(', ')}`);
    if (storyline?.logline) pieces.push(`Story logline: ${storyline.logline}`);
    if (storyline?.genre) pieces.push(`Genre: ${storyline.genre}`);
    if (storyline?.themes?.length) pieces.push(`Themes: ${storyline.themes.join(', ')}`);
    pieces.push('');
    pieces.push('Focus on: set design, location, atmosphere, lighting, mood, establishing shot, visual design.');

    const { text, error: genError } = await storyMuse.generate({
      task: 'visual_keyframe_prompt',
      prompt: pieces.join('\n'),
      providerId: llmSettings.llmProvider,
      ollamaBaseUrl: llmSettings.ollamaBaseUrl,
      ollamaModel: llmSettings.ollamaModel,
      openaiModel: llmSettings.openaiModel,
      claudeModel: llmSettings.claudeModel,
      lmstudioBaseUrl: llmSettings.lmstudioBaseUrl,
      lmstudioModel: llmSettings.lmstudioModel,
      openrouterModel: llmSettings.openrouterModel,
      openrouterBaseUrl: llmSettings.openrouterBaseUrl,
      maxTokens: 512,
      temperature: 0.8,
    });

    if (genError) {
      setError(genError);
      setPromptPendingId(null);
      return;
    }

    setEnvironments((prev: Environment[]) =>
      prev.map((e: Environment) => (e.id === env.id ? { ...e, promptPositive: text.trim() } : e)),
    );

    startTransition(async () => {
      try {
        await updateEnvironment(env.id, { promptPositive: text.trim() });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save environment prompt.');
      } finally {
        setPromptPendingId(null);
      }
    });
  }

  async function handleSuggestFromStory(env: Environment) {
    if (wbPending || storyMuse.isGenerating) return;
    setWbPending({ id: env.id, action: 'suggest' });

    const lines: string[] = ['ENVIRONMENT TO SUGGEST:', `Name: ${env.name}`];
    if (env.environmentType) lines.push(`Type: ${env.environmentType}`);
    if (env.description) lines.push(`Description: ${env.description}`);
    if (env.designNotes) lines.push(`Existing design notes: ${env.designNotes}`);

    lines.push('', 'PROJECT STORY CONTEXT:');
    if (storyline?.logline) lines.push(`Logline: ${storyline.logline}`);
    if (storyline?.genre) lines.push(`Genre: ${storyline.genre}`);
    if (storyline?.themes?.length) lines.push(`Themes: ${storyline.themes.join(', ')}`);
    if (storyline?.plotOutline) {
      const short = storyline.plotOutline.slice(0, 600);
      lines.push(`Plot outline: ${short}${storyline.plotOutline.length > 600 ? '…' : ''}`);
    }

    const { text, error: genError } = await storyMuse.generate({
      task: 'environment_brief_suggestion',
      prompt: lines.join('\n'),
      providerId: llmSettings.llmProvider,
      ollamaBaseUrl: llmSettings.ollamaBaseUrl,
      ollamaModel: llmSettings.ollamaModel,
      openaiModel: llmSettings.openaiModel,
      claudeModel: llmSettings.claudeModel,
      lmstudioBaseUrl: llmSettings.lmstudioBaseUrl,
      lmstudioModel: llmSettings.lmstudioModel,
      openrouterModel: llmSettings.openrouterModel,
      openrouterBaseUrl: llmSettings.openrouterBaseUrl,
      maxTokens: 512,
      temperature: 0.8,
    });

    if (genError) {
      setError(genError);
      setWbPending(null);
      return;
    }

    const parsed = parseBriefSuggestion(text);
    const updates: { description?: string; designNotes?: string } = {};
    if (parsed.description && !env.description) updates.description = parsed.description;
    if (parsed.designNotes && !env.designNotes) updates.designNotes = parsed.designNotes;

    if (Object.keys(updates).length > 0) {
      setEnvironments((prev) => prev.map((e) => (e.id === env.id ? { ...e, ...updates } : e)));
      startTransition(async () => {
        try {
          await updateEnvironment(env.id, updates);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to save environment.');
        } finally {
          setWbPending(null);
        }
      });
    } else {
      setWbPending(null);
    }
  }

  async function handleEnhanceDecorBrief(env: Environment) {
    if (wbPending || storyMuse.isGenerating) return;
    setWbPending({ id: env.id, action: 'enhance' });

    const lines: string[] = ['ENVIRONMENT TO ENHANCE:', `Name: ${env.name}`];
    if (env.environmentType) lines.push(`Type: ${env.environmentType}`);
    if (env.description) lines.push(`Description: ${env.description}`);
    if (env.designNotes) lines.push(`Existing design notes: ${env.designNotes}`);

    lines.push('', 'TASK:');
    lines.push(
      'Rewrite and expand the Existing design notes above into a richer, more specific visual direction. Preserve every explicit user constraint. Do not describe any other location.',
    );

    const toneLines: string[] = [];
    if (storyline?.logline) toneLines.push(`Logline: ${storyline.logline}`);
    if (storyline?.genre) toneLines.push(`Genre: ${storyline.genre}`);
    if (storyline?.themes?.length) toneLines.push(`Themes: ${storyline.themes.join(', ')}`);
    if (toneLines.length > 0) {
      lines.push('', 'STORY CONTEXT, for tone only:', ...toneLines);
    }

    const { text, error: genError } = await storyMuse.generate({
      task: 'environment_design_enhance',
      prompt: lines.join('\n'),
      providerId: llmSettings.llmProvider,
      ollamaBaseUrl: llmSettings.ollamaBaseUrl,
      ollamaModel: llmSettings.ollamaModel,
      openaiModel: llmSettings.openaiModel,
      claudeModel: llmSettings.claudeModel,
      lmstudioBaseUrl: llmSettings.lmstudioBaseUrl,
      lmstudioModel: llmSettings.lmstudioModel,
      openrouterModel: llmSettings.openrouterModel,
      openrouterBaseUrl: llmSettings.openrouterBaseUrl,
      maxTokens: 512,
      temperature: 0.7,
    });

    if (genError) {
      setError(genError);
      setWbPending(null);
      return;
    }

    const enhanced = text.trim();
    if (enhanced) {
      setEnvironments((prev) =>
        prev.map((e) => (e.id === env.id ? { ...e, designNotes: enhanced } : e)),
      );
      startTransition(async () => {
        try {
          await updateEnvironment(env.id, { designNotes: enhanced });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to save environment.');
        } finally {
          setWbPending(null);
        }
      });
    } else {
      setWbPending(null);
    }
  }

  function startEditDetails(env: Environment) {
    setEditDesc(env.description ?? '');
    setEditNotes(env.designNotes ?? '');
    setIsEditingDetails(true);
  }

  async function handleSaveDetails(env: Environment) {
    const updates = {
      description: editDesc.trim(),
      designNotes: editNotes.trim(),
    };
    setEnvironments((prev) => prev.map((e) => (e.id === env.id ? { ...e, ...updates } : e)));
    setIsEditingDetails(false);
    startTransition(async () => {
      try {
        await updateEnvironment(env.id, updates);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save details.');
      }
    });
  }
}
