// store/server/src/models/user.model.ts - For App Store TPA
import mongoose, { Schema, Document } from 'mongoose';

// Interface that matches the fields we need from the main User schema
export interface UserI extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  runningApps: string[];
  
  // Add installed apps field if not already in schema
  installedApps?: Array<{
    packageName: string;
    installedDate: Date;
  }>;

  // Add createdAt and updatedAt fields
  createdAt: Date;
  updatedAt: Date;
}

// Using existing schema with flexible access
const UserSchema = new Schema({}, { strict: false });

// Ensure installedApps exists in the schema
mongoose.connection.on('open', async () => {
  try {
    const collections = await mongoose.connection.db.listCollections({ name: 'users' }).toArray();
    if (collections.length > 0) {
      const userCollection = mongoose.connection.db.collection('users');
      const sampleUser = await userCollection.findOne();
      
      if (sampleUser && !sampleUser.installedApps) {
        console.log('Adding installedApps field to existing users');
        await userCollection.updateMany(
          { installedApps: { $exists: false } },
          { $set: { installedApps: [] } }
        );
      }
    }
  } catch (err) {
    console.error('Error checking user schema:', err);
  }
});

export default mongoose.model<UserI>('User', UserSchema, 'users');