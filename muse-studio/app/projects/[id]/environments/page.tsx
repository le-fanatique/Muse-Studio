import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AppHeader } from '@/components/layout/AppHeader';
import { getProjectById } from '@/lib/actions/projects';
import { listEnvironments } from '@/lib/actions/environments';
import { EnvironmentsPageClient } from '@/components/environments/EnvironmentsPageClient';
import { ChevronLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectEnvironmentsPage({ params }: PageProps) {
  const { id } = await params;

  const [project, environments] = await Promise.all([
    getProjectById(id),
    listEnvironments(id),
  ]);

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

      <EnvironmentsPageClient
        projectId={id}
        projectTitle={project.title}
        initialEnvironments={environments}
      />
    </div>
  );
}