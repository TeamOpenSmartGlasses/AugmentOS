interface Glasses {
    model_name: string;
    battery_life: number;
  }
  
  interface AppInfo {
    name: string;
    description: string;
    is_running: boolean;
    is_foreground: boolean;
  }
  
  interface AugmentOSMainStatus {
    puck_connected: boolean;
    puck_battery_life: number | null;
    glasses_connected: boolean;
    glasses_info: Glasses | null;
    apps: AppInfo[];
  }
  
  class AugmentOSParser {
    private status: AugmentOSMainStatus;
  
    constructor() {
      this.status = {
        puck_connected: false,
        puck_battery_life: null,
        glasses_connected: false,
        glasses_info: null,
        apps: [],
      };
    }
  
    /**
     * Parse a status message from AugmentOS_Main
     * @param data The raw JSON object received from the puck
     */
    parseStatus(data: any): void {
      if ("status" in data) {
        const status = data.status;
  
        this.status.puck_connected = true;
        this.status.puck_battery_life = status.puck_battery_life ?? null;
  
        if ("connected_glasses" in status) {
          this.status.glasses_connected = true;
          this.status.glasses_info = status.connected_glasses;
        } else {
          this.status.glasses_connected = false;
          this.status.glasses_info = null;
        }
  
        this.status.apps = status.apps?.map((app: any) => ({
          name: app.name || "Unknown App",
          description: app.description || "No description available",
          is_running: !!app.is_running,
          is_foreground: !!app.is_foreground,
        })) || [];
      }
    }
  
    /**
     * Get the current status of AugmentOS_Main
     * @returns AugmentOSMainStatus object
     */
    getStatus(): AugmentOSMainStatus {
      return this.status;
    }
  }
  
  export default AugmentOSParser;
  