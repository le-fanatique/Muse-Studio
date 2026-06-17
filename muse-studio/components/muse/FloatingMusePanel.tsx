'use client';

import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MuseChatPanel } from '@/components/muse/MuseChatPanel';

interface FloatingMusePanelProps {
  projectId: string;
}

export function FloatingMusePanel({ projectId }: FloatingMusePanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-[80] flex flex-col items-end">
      {open && (
        <div className="mb-3 flex w-[420px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-white/10 bg-[oklch(0.13_0.01_264)] shadow-2xl shadow-black/50 backdrop-blur">
          <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <MessageCircle className="h-4 w-4 text-violet-400" />
              Ask Muse
            </div>
            <button
              type="button"
              aria-label="Close Ask Muse"
              onClick={() => setOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="h-[520px] max-h-[70vh] overflow-hidden">
            <MuseChatPanel
              projectId={projectId}
              allowedMuses={['STORY_MUSE', 'VISUAL_MUSE', 'MOTION_MUSE']}
              compact={true}
              showLlmReminder={false}
              showKanbanHint={true}
              className="h-full"
            />
          </div>
        </div>
      )}

      <Button
        type="button"
        title="Ask Muse"
        aria-label="Ask Muse"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 hover:bg-violet-500"
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        Ask Muse
      </Button>
    </div>
  );
}
