import { MOCK_CONNECTION } from "./consts";

interface Glasses {
  model_name: string;
  battery_life: number;
  is_searching: boolean;
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
  icon: string; // Added this line to include the icon property
}


export interface AugmentOSMainStatus {
  puck_connected: boolean;
  puck_battery_life: number | null;
  puck_charging_status: boolean;
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
    glasses_info: null,
    wifi: { is_connected: false, ssid: '', signal_strength: 0 },
    gsm: { is_connected: false, carrier: '', signal_strength: 0 },
    apps: [],
  };

  static mockStatus: AugmentOSMainStatus = {
    puck_connected: true,
    puck_battery_life: 88,
    puck_charging_status: true,
    glasses_info: {
      model_name: 'Vuzix Z100',
      battery_life: 60,
      is_searching: false
    },
    wifi: { is_connected: true, ssid: 'TP-LINK69', signal_strength: 100 },
    gsm: { is_connected: false, carrier: '', signal_strength: 0 },
    apps: [
      {
        name: "YouTube",
        package_name: "com.google.android.youtube",
        icon: "youtube_icon",
        description: "Video streaming platform",
        is_running: true,
        is_foreground: true,
      },
      // {
      //   name: "Netflix",
      //   package_name: "com.netflix.mediaclient",
      //   icon: require('./assets/app-icons/adhd-rectangle.png'),
      //   description: "Movie and TV streaming",
      //   is_running: true,
      //   is_foreground: false,
      // },
      // {
      //   name: "Chrome",
      //   package_name: "com.android.chrome",
      //   icon: "placeholder",
      //   description: "Web browser",
      //   is_running: true,
      //   is_foreground: false,
      // },
      // {
      //   name: "Maps",
      //   package_name: "com.google.android.apps.maps",
      //   icon: "placeholder",
      //   description: "Navigation app",
      //   is_running: true,
      //   is_foreground: false,
      // },
      // {
      //   name: "Placeholder",
      //   package_name: "com.example.placeholder",
      //   icon: "placeholder",
      //   description: "Placeholder app",
      //   is_running: false,
      //   is_foreground: false
      // }
    ],
  };
  

  static parseStatus(data: any): AugmentOSMainStatus {
    if (MOCK_CONNECTION) return AugmentOSParser.mockStatus;
    // console.log('checking dat');
    if (data && 'status' in data) {
      console.log('data good?');
      const status = data.status;
      return {
        puck_connected: true,
        puck_battery_life: status.puck_battery_life ?? null,
        puck_charging_status: status.charging_status ?? false,
        glasses_info: status.connected_glasses
          ? {
              model_name: status.connected_glasses.model_name,
              battery_life: status.connected_glasses.battery_life,
              is_searching: status.connected_glasses.is_searching ?? false,
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
          icon: app.icon || 'default-icon-path',
        })) || [],
      };
    }
    return AugmentOSParser.defaultStatus;
  }
}

export default AugmentOSParser;
