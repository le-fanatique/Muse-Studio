import { FloatingMusePanel } from '@/components/muse/FloatingMusePanel';

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { id } = await params;

  return (
    <>
      {children}
      <FloatingMusePanel projectId={id} />
    </>
  );
}
