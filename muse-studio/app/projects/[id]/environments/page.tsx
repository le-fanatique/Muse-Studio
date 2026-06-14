import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';
import { getProjectById } from '@/lib/actions/projects';
import { ChevronLeft, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectEnvironmentsPage({ params }: PageProps) {
  const { id } = await params;

  const project = await getProjectById(id);

  if (!project) notFound();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <AppHeader
        projectTitle={project.title}
        projectId={project.id}
        activeMuse={project.activeMuse}
        controlLevel={project.museControlLevel}
        initialSuggestions={[]}
        overviewProject={{
          title: project.title,
          description: project.description,
          storyline: project.storyline,
          storylineSource: project.storylineSource,
          scenes: project.scenes,
        }}
      />

      {/* Breadcrumb / back */}
      <div className="flex items-center gap-2 border-b border-white/8 bg-[oklch(0.11_0.01_264)] px-4 py-2">
        <Link
          href={`/projects/${id}`}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-white/10 hover:text-foreground"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to project
        </Link>
        <span className="text-xs text-muted-foreground/60">·</span>
        <span className="text-xs font-medium text-foreground">Environments</span>
      </div>

      {/* Placeholder */}
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15">
            <MapPin className="h-6 w-6 text-violet-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Environments</p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              This feature is under construction.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}