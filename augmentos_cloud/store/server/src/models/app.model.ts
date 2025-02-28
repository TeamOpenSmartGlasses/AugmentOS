// store/server/src/models/app.model.ts
import mongoose, { Schema, Document } from 'mongoose';
import { AppI as _AppI, AppSettings, TpaType } from '@augmentos/sdk';

// Extend the AppI interface for our MongoDB document
export interface AppI extends _AppI, Document {
  createdAt: Date;
  updatedAt: Date;
}

// Create Schema based on AppI interface
const AppSchema: Schema = new Schema({
  packageName: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  webhookURL: { type: String, required: true },
  logoURL: { type: String, required: true },
  webviewURL: { type: String },
  tpaType: { 
    type: String, 
    required: true,
    enum: Object.values(TpaType),
    default: TpaType.STANDARD
  },
  appStoreId: { type: String },
  developerId: { type: String, required: true },
  
  // Auth fields
  hashedApiKey: { type: String, required: true },
  hashedEndpointSecret: { type: String },
  
  // App details
  version: { type: String },
  settings: { type: Schema.Types.Mixed }, // Store app settings
  
  // Custom fields not in AppI
  isPublic: { type: Boolean, default: false }
}, { 
  timestamps: true 
});

export default mongoose.model<AppI>('App', AppSchema);