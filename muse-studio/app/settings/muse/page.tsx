import { getMusePromptSettings } from '@/lib/actions/settings';
import { MuseSettings } from '@/components/settings/MuseSettings';

export const dynamic = 'force-dynamic';

export default async function MuseSettingsPage() {
  const overrides = await getMusePromptSettings();
  return <MuseSettings initialOverrides={overrides} />;
}
