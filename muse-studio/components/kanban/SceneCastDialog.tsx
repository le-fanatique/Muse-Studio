'use client';

import { useEffect, useState, useTransition } from 'react';
import { Users, X, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Scene, Character, Environment } from '@/lib/types';
import {
  linkCharacterToScene,
  unlinkCharacterFromScene,
  setSceneEnvironment,
} from '@/lib/actions/scenes';

interface SceneCastDialogProps {
  isOpen: boolean;
  scene: Scene | null;
  projectId: string;
  characters: Character[];
  environments: Environment[];
  onClose: () => void;
}

export function SceneCastDialog({
  isOpen,
  scene,
  projectId,
  characters,
  environments,
  onClose,
}: SceneCastDialogProps) {
  const [linkedCharacterIds, setLinkedCharacterIds] = useState<Set<string>>(new Set());
  const [linkedEnvironmentId, setLinkedEnvironmentId] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (scene) {
      setLinkedCharacterIds(new Set(scene.characters?.map((c) => c.id) ?? []));
      setLinkedEnvironmentId(scene.environment?.id ?? '');
    }
  }, [scene]);

  if (!isOpen || !scene) return null;

  const sceneId = scene.id;

  function handleCharacterToggle(characterId: string, checked: boolean) {
    setLinkedCharacterIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(characterId);
      else next.delete(characterId);
      return next;
    });

    startTransition(async () => {
      if (checked) {
        await linkCharacterToScene(sceneId, characterId, projectId);
      } else {
        await unlinkCharacterFromScene(sceneId, characterId, projectId);
      }
    });
  }

  function handleEnvironmentChange(value: string) {
    setLinkedEnvironmentId(value);
    startTransition(async () => {
      await setSceneEnvironment(sceneId, value || null, projectId);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cast-dialog-title"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/12 bg-[oklch(0.13_0.012_264)] shadow-2xl shadow-black/60 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20">
              <Users className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <h2 id="cast-dialog-title" className="text-sm font-semibold">Cast &amp; Location</h2>
              <p className="text-xs text-muted-foreground/60">
                #{String(scene.sceneNumber).padStart(2, '0')} · {scene.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/8 text-muted-foreground transition-colors hover:border-white/15 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-5 overflow-y-auto max-h-[60vh]">

          {/* Characters */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Characters
            </p>
            {characters.length === 0 ? (
              <p className="text-xs text-muted-foreground/50 py-1">No characters available.</p>
            ) : (
              <div className="space-y-0.5">
                {characters.map((char) => {
                  const checked = linkedCharacterIds.has(char.id);
                  return (
                    <label
                      key={char.id}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 cursor-pointer transition-colors select-none',
                        'hover:bg-white/5',
                        isPending && 'opacity-60 pointer-events-none',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isPending}
                        onChange={(e) => handleCharacterToggle(char.id, e.target.checked)}
                        className="h-3.5 w-3.5 shrink-0 rounded border-white/20 accent-violet-500"
                      />
                      <span className="text-sm leading-tight flex-1 min-w-0 truncate">{char.name}</span>
                      {char.primaryRole && (
                        <span className="text-[11px] text-muted-foreground/50 shrink-0">
                          {char.primaryRole}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Location */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 flex items-center gap-1.5">
              <MapPin className="h-3 w-3" />
              Location
            </p>
            {environments.length === 0 ? (
              <p className="text-xs text-muted-foreground/50 py-1">No locations available.</p>
            ) : (
              <select
                value={linkedEnvironmentId}
                disabled={isPending}
                onChange={(e) => handleEnvironmentChange(e.target.value)}
                className={cn(
                  'w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-foreground',
                  'focus:outline-none focus:ring-1 focus:ring-violet-500/40 focus:border-violet-500/40',
                  'disabled:opacity-60 transition-colors',
                )}
              >
                <option value="">None</option>
                {environments.map((env) => (
                  <option key={env.id} value={env.id}>
                    {env.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
