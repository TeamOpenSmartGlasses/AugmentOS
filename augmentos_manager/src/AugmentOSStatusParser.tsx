import { MOCK_CONNECTION } from './consts';

interface Glasses {
  model_name: string;
  battery_life: number;
  is_searching: boolean;
  brightness: number | null; // 0-100
}

interface WifiConnection {
  is_connected: boolean;
  ssid: string;
  signal_strength: number; // 0-100
}

interface GSMConnection {
  is_connected: boolean;
  carrier: string;
  signal_strength: number; // 0-100
}

export interface AppInfo {
  name: string;
  description: string;
  is_running: boolean;
  is_foreground: boolean;
  package_name: string;
  icon: string;
  type: string;
}

export interface AugmentOSMainStatus {
  puck_connected: boolean;
  puck_battery_life: number | null;
  puck_charging_status: boolean;
  default_wearable: string | null,
  sensing_enabled: boolean;
  glasses_info: Glasses | null;
  wifi: WifiConnection | null;
  gsm: GSMConnection | null;
  apps: AppInfo[];
}

export class AugmentOSParser {
  static defaultStatus: AugmentOSMainStatus = {
    puck_connected: false,
    puck_battery_life: null,
    puck_charging_status: false,
    sensing_enabled: false,
    default_wearable: null,
    glasses_info: null,
    wifi: { is_connected: false, ssid: '', signal_strength: 0 },
    gsm: { is_connected: false, carrier: '', signal_strength: 0 },
    apps: [],
  };

  static mockStatus: AugmentOSMainStatus = {
    puck_connected: true,
    puck_battery_life: 88,
    puck_charging_status: true,
    sensing_enabled: true,
   // default_wearable: 'Vuzix Z100',
   default_wearable: 'evenrealities_g1',
    glasses_info: {
      model_name: 'Even Realities G1',
      //model_name: 'Vuzix Z100',
      battery_life: 60,
      is_searching: false,
      brightness: 87,
    },
    wifi: { is_connected: true, ssid: 'TP-LINK69', signal_strength: 100 },
    gsm: { is_connected: false, carrier: '', signal_strength: 0 },
    apps: [
      {
        name: 'Mentra Merge',
        package_name: 'com.mentra.merge',
        icon: '/assets/app-icons/mentra-merge.png',
        description: 'AI executive functioning aid',
        is_running: true,
        is_foreground: true,
        type: 'APP'
      },
      {
        name: 'Live Translation',
        package_name: 'com.mentra.livetranslation',
        icon: '/assets/app-icons/translation.png',
        description: 'Movie and TV streaming',
        is_running: false,
        is_foreground: false,
        type: 'APP'
      },
      {
        name: 'Navigation',
        package_name: 'com.mentra.navigation',
        icon: '/assets/app-icons/navigation.png',
        description: 'Navigation app',
        is_running: false,
        is_foreground: false,
        type: 'APP'
      },
      {
        name: 'Mira AI',
        package_name: 'com.mentra.miraai',
        icon: '/assets/app-icons/mira-ai.png',
        description: 'AI assistant',
        is_running: false,
        is_foreground: false,
        type: 'APP'
      },
      {
        name: 'Screen Mirror',
        package_name: 'com.mentra.screenmirror',
        icon: '/assets/app-icons/screen-mirror.png',
        description: 'Screen mirroring app',
        is_running: false,
        is_foreground: false,
        type: 'APP'
      },
      {
        name: 'Captions',
        package_name: 'com.mentra.livecaptions',
        icon: '/assets/app-icons/captions.png',
        description: 'Live captioning app',
        is_running: false,
        is_foreground: false,
        type: 'APP'
      },
      {
        name: 'ADHD Aid',
        package_name: 'com.mentra.adhdaid',
        icon: '/assets/app-icons/adhd-aid.png',
        description: 'ADHD aid app',
        is_running: false,
        is_foreground: false,
        type: 'APP'
      },
      {
        name: 'Mentra Link',
        package_name: 'com.mentra.link',
        icon: '/assets/app-icons/mentra-link.png',
        description: 'Language learning app',
        is_running: false,
        is_foreground: false,
        type: 'APP'
      },
    ],
  };

  static parseStatus(data: any): AugmentOSMainStatus {
    if (MOCK_CONNECTION) {return AugmentOSParser.mockStatus;}
    if (data && 'status' in data) {
      console.log('data good?');
      let status = data.status;

      return {
        puck_connected: true,
        puck_battery_life: status.puck_battery_life ?? null,
        puck_charging_status: status.charging_status ?? false,
        sensing_enabled: status.sensing_enabled ?? false,
        default_wearable: status.default_wearable ?? null,
        glasses_info: status.connected_glasses
          ? {
              model_name: status.connected_glasses.model_name,
              battery_life: status.connected_glasses.battery_life,
              is_searching: status.connected_glasses.is_searching ?? false,
              brightness: status.connected_glasses.brightness,
            }
          : null,
        wifi: status.wifi ?? AugmentOSParser.defaultStatus.wifi,
        gsm: status.gsm ?? AugmentOSParser.defaultStatus.gsm,
        apps: status.apps?.map((app: any) => ({
          name: app.name || 'Unknown App',
          description: app.description || 'No description available',
          is_running: !!app.is_running,
          is_foreground: !!app.is_foreground,
          package_name: app.package_name || 'unknown.package',
          icon: app.icon || '/assets/icons/default-app.png',
          type: app.type || 'APP'
        })) || [],
      };
    }
    return AugmentOSParser.defaultStatus;
  }
}

export default AugmentOSParser;
