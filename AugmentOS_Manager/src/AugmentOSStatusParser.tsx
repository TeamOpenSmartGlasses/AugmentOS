interface Glasses {
  model_name: string;
  battery_life: number;
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

interface AppInfo {
  name: string;
  description: string;
  is_running: boolean;
  is_foreground: boolean;
  package_name: string;
}

interface AugmentOSMainStatus {
  puck_connected: boolean;
  puck_battery_life: number | null;
  charging_status: boolean;
  glasses_info: Glasses | null;
  wifi: WifiConnection | null;
  gsm: GSMConnection | null;
  apps: AppInfo[];
}

class AugmentOSParser {
  private status: AugmentOSMainStatus;

  constructor() {
    // Default initial status with empty values
    this.status = {
      puck_connected: false,
      puck_battery_life: null,
      charging_status: false,
      glasses_info: null,
      wifi: { is_connected: false, ssid: '', signal_strength: 0 },
      gsm: { is_connected: false, carrier: '', signal_strength: 0 },
      apps: [],
    };
  }

  /**
   * Parse a status message from AugmentOS_Main.
   * @param data The raw JSON object received from the puck.
   */
  parseStatus(data: any): void {
    if ("status" in data) {
      const status = data.status;

      this.status.puck_connected = true;
      this.status.puck_battery_life = status.puck_battery_life ?? null;
      this.status.charging_status = status.charging_status ?? false;

      if ("connected_glasses" in status) {
        this.status.glasses_info = status.connected_glasses;
      } else {
        this.status.glasses_info = null;
      }

      this.status.wifi = status.wifi ?? this.status.wifi;
      this.status.gsm = status.gsm ?? this.status.gsm;

      this.status.apps = status.apps?.map((app: any) => ({
        name: app.name || "Unknown App",
        description: app.description || "No description available",
        is_running: !!app.is_running,
        is_foreground: !!app.is_foreground,
        package_name: app.package_name || "unknown.package",
      })) || [];
    }
  }

  /**
   * Get the current status of AugmentOS_Main.
   * @returns AugmentOSMainStatus object.
   */
  getStatus(): AugmentOSMainStatus {
    return this.status;
  }
}

export default AugmentOSParser;
