// cloud/src/models/user.model.ts
import mongoose, { Schema, Document, Model } from 'mongoose';
import { AppSettingType, type AppSetting } from '@augmentos/sdk';
import { MongoSanitizer } from '../utils/mongoSanitizer';

interface Location {
  lat: number;
  lng: number;
}

interface InstalledApp {
  packageName: string;
  installedDate: Date;
}

// Extend Document for TypeScript support
interface UserDocument extends Document {
  email: string;
  runningApps: string[];
  appSettings: Map<string, AppSetting[]>;
  location?: Location;
  installedApps?: Array<{
    packageName: string;
    installedDate: Date;
  }>;

  setLocation(location: Location): Promise<void>;
  addRunningApp(appName: string): Promise<void>;
  removeRunningApp(appName: string): Promise<void>;
  updateAppSettings(appName: string, settings: { key: string; value: any }[]): Promise<void>;
  // getAppSettings(appName: string): AppSetting[] | undefined;
  getAppSettings(appName: string): any[] | undefined;
  isAppRunning(appName: string): boolean;

  // New methods for installed apps
  installApp(packageName: string): Promise<void>;
  uninstallApp(packageName: string): Promise<void>;
  isAppInstalled(packageName: string): boolean;
}

const InstalledAppSchema = new Schema({
  packageName: { type: String, required: true },
  installedDate: { type: Date, default: Date.now }
});

// --- New Schema for Lightweight Updates ---
const AppSettingUpdateSchema = new Schema({
  key: { type: String, required: true },
  value: { type: Schema.Types.Mixed, required: true }
}, { _id: false });

// // Setting schemas (unchanged)
// const ToggleSettingSchema = new Schema({
//   type: { type: String, enum: ['toggle'], required: true },
//   key: { type: String, required: true },
//   label: { type: String, required: true },
//   defaultValue: { type: Boolean, required: true }
// });

// const TextSettingSchema = new Schema({
//   type: { type: String, enum: ['text'], required: true },
//   key: { type: String, required: true },
//   label: { type: String, required: true },
//   defaultValue: { type: String }
// });

// const SelectOptionSchema = new Schema({
//   label: { type: String, required: true },
//   value: { type: String, required: true }
// });

// const SelectSettingSchema = new Schema({
//   type: { type: String, enum: ['select'], required: true },
//   key: { type: String, required: true },
//   label: { type: String, required: true },
// });

// --- User Schema ---
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
        return new Set(apps).size === apps.length;
      },
      message: 'Running apps must be unique'
    }
  },
  appSettings: {
    type: Map,
    of: [AppSettingUpdateSchema], // Use the new schema for updates
    default: new Map()
  },

  installedApps: {
    type: [InstalledAppSchema],
    default: [],
    validate: {
      validator: function(apps: InstalledApp[]) {
        // Ensure no duplicate package names
        const packageNames = apps.map(app => app.packageName);
        return new Set(packageNames).size === packageNames.length;
      },
      message: 'Installed apps must be unique'
    }
  }
}, {
  timestamps: true,
  optimisticConcurrency: true,
  toJSON: {
    transform: (doc, ret) => {
      delete ret.__v;
      ret.id = ret._id;
      delete ret._id;
      ret.appSettings = Object.fromEntries(ret.appSettings);
      return ret;
    }
  }
});

// // Add discriminators
// AppSettingUpdateSchema.discriminator('toggle', ToggleSettingSchema);
// AppSettingUpdateSchema.discriminator('text', TextSettingSchema);
// AppSettingUpdateSchema.discriminator('select', SelectSettingSchema);

// Create compound index for unique running apps per user
UserSchema.index({ email: 1, 'runningApps': 1 }, { unique: true });

// Instance methods

// Install / uninstall.
// Add methods for managing installed apps
UserSchema.methods.installApp = async function (this: UserDocument, packageName: string): Promise<void> {
  if (!this.isAppInstalled(packageName)) {
    if (!this.installedApps) {
      this.installedApps = [];
    }
    this.installedApps.push({
      packageName,
      installedDate: new Date()
    });
    await this.save();
  }
};

UserSchema.methods.uninstallApp = async function (this: UserDocument, packageName: string): Promise<void> {
  if (this.isAppInstalled(packageName)) {
    if (!this.installedApps) {
      this.installedApps = [];
    }
    this.installedApps = this.installedApps.filter(app => app.packageName !== packageName);
    await this.save();
  }
};

UserSchema.methods.isAppInstalled = function(this: UserDocument, packageName: string): boolean {
  return this.installedApps?.some(app => app.packageName === packageName) ?? false;
}

// Update location.
UserSchema.methods.setLocation = async function (this: UserDocument, location: Location): Promise<void> {
  this.location = location;
  await this.save();
}

UserSchema.methods.addRunningApp = async function (this: UserDocument, appName: string): Promise<void> {
  if (!this.runningApps.includes(appName)) {
    this.runningApps.push(appName);
    await this.save();
  }
};

UserSchema.methods.removeRunningApp = async function (this: UserDocument, appName: string): Promise<void> {
  if (this.runningApps.includes(appName)) {
    this.runningApps = this.runningApps.filter(app => app !== appName);
    await this.save();
  }
};

// UserSchema.methods.updateAppSettings = async function (
//   this: UserDocument,
//   appName: string,
//   settings: AppSetting[]
// ): Promise<void> {
//   // Validate settings before updating
//   const isValid = settings.every(setting => {
//     switch (setting.type) {
//       case AppSettingType.TOGGLE:
//         return typeof setting.defaultValue === 'boolean';
//       case AppSettingType.SELECT:
//         return Array.isArray(setting.options) &&
//           setting.options.length > 0 &&
//           (!setting.defaultValue || setting.options.some(opt => opt.value === setting.defaultValue));
//       case AppSettingType.TEXT:
//         return true; // Text settings can have any string default value
//       default:
//         return false;


UserSchema.methods.updateAppSettings = async function(
  appName: string, 
  settings: { key: string; value: any }[]
): Promise<void> {
  console.log('Settings update payload (before saving):', JSON.stringify(settings));

  // Sanitize the appName since it's used as a Map key
  const sanitizedAppName = MongoSanitizer.sanitizeKey(appName);

  // Retrieve existing settings and convert subdocuments to plain objects.
  const existingSettings = this.appSettings.get(sanitizedAppName);
  let existingSettingsPlain: { key: string; value: any }[] = [];
  if (existingSettings && Array.isArray(existingSettings)) {
    existingSettingsPlain = existingSettings.map((s: any) =>
      typeof s.toObject === 'function' ? s.toObject() : s
    );
  }

  // Create a map from the existing settings.
  const existingSettingsMap = new Map(existingSettingsPlain.map(s => [s.key, s.value]));

  // Merge updates from the payload.
  settings.forEach(update => {
    if (update.key !== undefined) { // extra guard to prevent undefined keys
      existingSettingsMap.set(update.key, update.value);
    }
  });

  // Convert the merged map back into an array of settings.
  const updatedSettingsArray = Array.from(existingSettingsMap.entries()).map(
    ([key, value]) => ({ key, value })
  );

  this.appSettings.set(sanitizedAppName, settings);
  await this.save();

  console.log('Updated settings:', JSON.stringify(updatedSettingsArray));
  const afterUpdate = this.appSettings.get(sanitizedAppName);
  console.log('Settings retrieved after save:', JSON.stringify(afterUpdate));
};

UserSchema.methods.getAppSettings = function (this: UserDocument, appName: string): AppSetting[] | undefined {
  // Sanitize the appName when retrieving from the Map
  const sanitizedAppName = MongoSanitizer.sanitizeKey(appName);
  const settings = this.appSettings.get(sanitizedAppName);
  return settings;
};

UserSchema.methods.isAppRunning = function (this: UserDocument, appName: string): boolean {
  return this.runningApps.includes(appName);
};

// --- Static Methods ---
UserSchema.statics.findByEmail = async function(email: string): Promise<UserDocument | null> {
  return this.findOne({ email: email.toLowerCase() });
};

UserSchema.statics.findOrCreateUser = async function (email: string): Promise<UserDocument> {
  email = email.toLowerCase();
  let user = await this.findOne({ email });
  if (!user) {
    user = await this.create({ email });
  }
  return user;
};

// --- Middleware ---
UserSchema.pre('save', function(next) {
  if (this.email) {
    this.email = this.email.toLowerCase();
  }
  if (this.runningApps) {
    this.runningApps = [...new Set(this.runningApps)];
  }
  next();
});

// --- Interface for Static Methods ---
interface UserModel extends Model<UserDocument> {
  findByEmail(email: string): Promise<UserDocument | null>;
  findOrCreateUser(email: string): Promise<UserDocument>;
}

export const User = mongoose.model<UserDocument, UserModel>('User', UserSchema);
