// src/streams.ts

/**
 * Types of streams that TPAs can subscribe to
 * 
 * These are events and data that TPAs can receive from the cloud.
 * Not all message types can be subscribed to as streams.
 */
export enum StreamType {
    // Hardware streams
    BUTTON_PRESS = 'button_press',
    HEAD_POSITION = 'head_position',
    GLASSES_BATTERY_UPDATE = 'glasses_battery_update',
    PHONE_BATTERY_UPDATE = 'phone_battery_update',
    GLASSES_CONNECTION_STATE = 'glasses_connection_state',
    LOCATION_UPDATE = 'location_update',
    
    // Audio streams
    TRANSCRIPTION = 'transcription',
    TRANSLATION = 'translation',
    VAD = 'VAD',
    AUDIO_CHUNK = 'audio_chunk',
    
    // Phone streams
    PHONE_NOTIFICATION = 'phone_notification',
    NOTIFICATION_DISMISSED = 'notification_dismissed',
    
    // System streams
    START_APP = 'start_app',
    STOP_APP = 'stop_app',
    OPEN_DASHBOARD = 'open_dashboard',
    
    // Video streams
    VIDEO = 'video',
    
    // Special subscription types
    ALL = 'all',
    WILDCARD = '*'
  }
  
  /**
   * Categories of stream data
   */
  export enum StreamCategory {
    /** Data from hardware sensors */
    HARDWARE = 'hardware',
    
    /** Audio processing results */
    AUDIO = 'audio',
    
    /** Phone-related events */
    PHONE = 'phone',
    
    /** System-level events */
    SYSTEM = 'system'
  }
  
  /**
   * Map of stream categories for each stream type
   */
  export const STREAM_CATEGORIES: Record<StreamType, StreamCategory> = {
    [StreamType.BUTTON_PRESS]: StreamCategory.HARDWARE,
    [StreamType.HEAD_POSITION]: StreamCategory.HARDWARE,
    [StreamType.GLASSES_BATTERY_UPDATE]: StreamCategory.HARDWARE,
    [StreamType.PHONE_BATTERY_UPDATE]: StreamCategory.HARDWARE,
    [StreamType.GLASSES_CONNECTION_STATE]: StreamCategory.HARDWARE,
    [StreamType.LOCATION_UPDATE]: StreamCategory.HARDWARE,
    
    [StreamType.TRANSCRIPTION]: StreamCategory.AUDIO,
    [StreamType.TRANSLATION]: StreamCategory.AUDIO,
    [StreamType.VAD]: StreamCategory.AUDIO,
    [StreamType.AUDIO_CHUNK]: StreamCategory.AUDIO,
    
    [StreamType.PHONE_NOTIFICATION]: StreamCategory.PHONE,
    [StreamType.NOTIFICATION_DISMISSED]: StreamCategory.PHONE,
    
    [StreamType.START_APP]: StreamCategory.SYSTEM,
    [StreamType.STOP_APP]: StreamCategory.SYSTEM,
    [StreamType.OPEN_DASHBOARD]: StreamCategory.SYSTEM,
    
    [StreamType.VIDEO]: StreamCategory.HARDWARE,
    
    [StreamType.ALL]: StreamCategory.SYSTEM,
    [StreamType.WILDCARD]: StreamCategory.SYSTEM
  };
  
  /**
   * Helper function to check if a stream type is of a particular category
   */
  export function isStreamCategory(streamType: StreamType, category: StreamCategory): boolean {
    return STREAM_CATEGORIES[streamType] === category;
  }
  
  /**
   * Helper function to get all stream types in a category
   */
  export function getStreamTypesByCategory(category: StreamCategory): StreamType[] {
    return Object.entries(STREAM_CATEGORIES)
      .filter(([_, cat]) => cat === category)
      .map(([type]) => type as StreamType);
  }