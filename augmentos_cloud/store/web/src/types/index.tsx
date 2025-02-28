/**
 * App information
 */
export interface App {
  /** Package name (unique identifier) */
  packageName: string;

  /** Display name */
  name: string;

  /** App description */
  description: string;

  /** URL to app logo */
  logoUrl: string;

  /** Developer name */
  developerName?: string;

  /** Installation date (for installed apps) */
  installedDate?: string;
}