import { App } from "@/types";

// In AppCard.tsx
interface AppCardProps {
  app: App;
  isInstalled: boolean;
  onInstall: () => void;
  onUninstall: () => void;
  isAuthenticated: boolean;
}

export function AppCard({ app, isInstalled, onInstall, onUninstall, isAuthenticated }: AppCardProps) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4">
        <div className="flex items-center">
          <img 
            src={app.logoUrl} 
            alt={`${app.name} logo`} 
            className="w-12 h-12 rounded-lg shadow-md"
            // onError={(e) => {
            //   // Fallback for broken images
            //   (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48';
            // }}
          />
          <div className="ml-4">
            <h3 className="text-lg font-semibold text-gray-800">{app.name}</h3>
            {app.developerName && (
              <p className="text-sm text-gray-500">By {app.developerName}</p>
            )}
          </div>
        </div>

        <p className="mt-2 text-gray-600 text-sm">{app.description}</p>
        
        {isInstalled && app.installedDate && (
          <p className="mt-1 text-xs text-gray-500">
            Installed: {new Date(app.installedDate).toLocaleDateString()}
          </p>
        )}
      </div>

      <div className="px-4 py-3 bg-gray-50 text-right">
        {isAuthenticated ? (
          // Show action buttons for authenticated users
          isInstalled ? (
            <button
              onClick={onUninstall}
              className="px-4 py-2 bg-red-500 text-white text-sm font-medium rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
            >
              Uninstall
            </button>
          ) : (
            <button
              onClick={onInstall}
              className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              Install
            </button>
          )
        ) : (
          // For public browsing, show a disabled button with a message
          <button
            className="px-4 py-2 bg-gray-300 text-gray-600 text-sm font-medium rounded cursor-not-allowed"
            title="Launch from AugmentOS to install"
          >
            View Only
          </button>
        )}
      </div>
    </div>
  );
}