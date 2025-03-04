// cloud/server/src/models/app.model.ts
import mongoose, { Schema, Document } from 'mongoose';
import { AppI as _AppI, TpaType } from '@augmentos/sdk';

// Extend the AppI interface for our MongoDB document
export interface AppI extends _AppI, Document {
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
  hashedApiKey: string;
  hashedEndpointSecret?: string;
}

// Using existing schema with flexible access
const AppSchema = new Schema({}, { 
  strict: false,
  timestamps: true 
});

export default mongoose.model<AppI>('App', AppSchema, 'apps');