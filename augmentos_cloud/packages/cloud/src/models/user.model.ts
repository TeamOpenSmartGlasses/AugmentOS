// models/user.model.ts
import mongoose, { Schema, Document, Model } from 'mongoose';
import { AppSettingType, type AppSetting } from '@augmentos/types';

interface Location {
  lat: number;
  lng: number;
}

// Extend Document for TypeScript support
interface UserDocument extends Document {
  email: string;
  runningApps: string[];
  appSettings: Map<string, AppSetting[]>;
  location?: Location;

  setLocation(location: Location): Promise<void>;
  addRunningApp(appName: string): Promise<void>;
  removeRunningApp(appName: string): Promise<void>;
  updateAppSettings(appName: string, settings: AppSetting[]): Promise<void>;
  getAppSettings(appName: string): AppSetting[] | undefined;
  isAppRunning(appName: string): boolean;
}

// Setting schemas (unchanged)
const ToggleSettingSchema = new Schema({
  type: { type: String, enum: ['toggle'], required: true },
  key: { type: String, required: true },
  label: { type: String, required: true },
  defaultValue: { type: Boolean, required: true }
});

const TextSettingSchema = new Schema({
  type: { type: String, enum: ['text'], required: true },
  key: { type: String, required: true },
  label: { type: String, required: true },
  defaultValue: { type: String }
});

const SelectOptionSchema = new Schema({
  label: { type: String, required: true },
  value: { type: String, required: true }
});

const SelectSettingSchema = new Schema({
  type: { type: String, enum: ['select'], required: true },
  key: { type: String, required: true },
  label: { type: String, required: true },
  options: [SelectOptionSchema],
  defaultValue: { type: String }
});

const AppSettingSchema = new Schema({
  type: { type: String, required: true }
}, { discriminatorKey: 'type' });

const UserSchema = new Schema<UserDocument>({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    }
  },
  // Cache location so timezones can be calculated by dashboard manager immediately.
  location: {
    type: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    }
  },

  runningApps: { 
    type: [String], 
    default: [],
    validate: {
      validator: function(apps: string[]) {
        // Ensure no duplicates
        return new Set(apps).size === apps.length;
      },
      message: 'Running apps must be unique'
    }
  },
  appSettings: {
    type: Map,
    of: [AppSettingSchema],
    default: new Map()
  }
}, { 
  timestamps: true,
  // Add optimistic concurrency control
  optimisticConcurrency: true,
  // Modify JSON serialization
  toJSON: {
    transform: (doc, ret) => {
      delete ret.__v;
      ret.id = ret._id;
      delete ret._id;
      // Convert Map to plain object for JSON
      ret.appSettings = Object.fromEntries(ret.appSettings);
      return ret;
    }
  }
});

// Add discriminators
AppSettingSchema.discriminator('toggle', ToggleSettingSchema);
AppSettingSchema.discriminator('text', TextSettingSchema);
AppSettingSchema.discriminator('select', SelectSettingSchema);

// Create compound index for unique running apps per user
UserSchema.index({ email: 1, 'runningApps': 1 }, { unique: true });

// Instance methods
// Update location.

UserSchema.methods.setLocation = async function(this: UserDocument, location: Location): Promise<void> {
  this.location = location;
  await this.save();
}

UserSchema.methods.addRunningApp = async function(this: UserDocument, appName: string): Promise<void> {
  if (!this.runningApps.includes(appName)) {
    this.runningApps.push(appName);
    await this.save();
  }
};

UserSchema.methods.removeRunningApp = async function(this: UserDocument, appName: string): Promise<void> {
  if (this.runningApps.includes(appName)) {
    this.runningApps = this.runningApps.filter(app => app !== appName);
    await this.save();
  }
};

UserSchema.methods.updateAppSettings = async function(
  this: UserDocument,
  appName: string, 
  settings: AppSetting[]
): Promise<void> {
  // Validate settings before updating
  const isValid = settings.every(setting => {
    switch (setting.type) {
      case AppSettingType.TOGGLE:
        return typeof setting.defaultValue === 'boolean';
      case AppSettingType.SELECT:
        return Array.isArray(setting.options) && 
               setting.options.length > 0 &&
               (!setting.defaultValue || setting.options.some(opt => opt.value === setting.defaultValue));
      case AppSettingType.TEXT:
        return true; // Text settings can have any string default value
      default:
        return false;
    }
  });

  if (!isValid) {
    throw new Error('Invalid settings format');
  }

  this.appSettings.set(appName, settings);
  await this.save();
};

UserSchema.methods.getAppSettings = function(this: UserDocument, appName: string): AppSetting[] | undefined {
  return this.appSettings.get(appName);
};

UserSchema.methods.isAppRunning = function(this: UserDocument, appName: string): boolean {
  return this.runningApps.includes(appName);
};

// Static methods
UserSchema.statics.findByEmail = async function(email: string): Promise<UserDocument | null> {
  return this.findOne({ email: email.toLowerCase() });
};

UserSchema.statics.findOrCreateUser = async function(email: string): Promise<UserDocument> {
  email = email.toLowerCase();
  let user = await this.findOne({ email });
  if (!user) {
    user = await this.create({ email });
  }
  return user;
};

// Middleware
UserSchema.pre('save', function(next) {
  // Ensure email is lowercase
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  
  // Ensure runningApps has no duplicates
  if (this.runningApps) {
    this.runningApps = [...new Set(this.runningApps)];
  }
  
  next();
});

// Interface for static methods
interface UserModel extends Model<UserDocument> {
  findByEmail(email: string): Promise<UserDocument | null>;
  findOrCreateUser(email: string): Promise<UserDocument>;
}

export const User = mongoose.model<UserDocument, UserModel>('User', UserSchema);