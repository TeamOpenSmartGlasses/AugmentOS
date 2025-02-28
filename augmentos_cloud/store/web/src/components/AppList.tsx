
import { App } from "@/types";
import { AppCard } from "./AppCard";

// In AppList.tsx
interface AppListProps {
  apps: App[];
  type: 'available' | 'installed' | 'browse';
  onInstall: (packageName: string) => void;
  onUninstall: (packageName: string) => void;
  isAuthenticated: boolean;
}

export function AppList({ apps, type, onInstall, onUninstall, isAuthenticated }: AppListProps) {
  if (apps.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <p className="text-gray-500">
          {type === 'available' 
            ? 'No apps available at this time.' 
            : type === 'installed'
              ? 'You have no installed apps.'
              : 'No apps are currently available.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {apps.map(app => (
        <AppCard 
          key={app.packageName}
          app={app}
          isInstalled={type === 'installed'}
          onInstall={() => onInstall(app.packageName)}
          onUninstall={() => onUninstall(app.packageName)}
          isAuthenticated={isAuthenticated}
        />
      ))}
    </div>
  );
}