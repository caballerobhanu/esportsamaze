import { getMaintenanceSettings } from '@/lib/site-settings';
import { MaintenanceView } from '@/components/maintenance/maintenance-view';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Under Maintenance | Esports Amaze',
  description: 'Esports Amaze platform maintenance and updates.',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function MaintenancePreviewPage() {
  const settings = await getMaintenanceSettings();

  return <MaintenanceView settings={settings} />;
}
