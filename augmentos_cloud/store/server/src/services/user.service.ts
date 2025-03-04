// services/user.service.ts
import User, { UserI } from '../models/user.model';

/**
 * Find a user by their email or create a new user
 */
export async function findOrCreateUser(email: string): Promise<UserI> {
  email = email.toLowerCase();
  
  // Try to find existing user
  let user = await User.findOne({ email });
  
  // If user doesn't exist, create a new one
  if (!user) {
    user = new User({
      email,
      runningApps: [],
      installedApps: []
    });
    await user.save();
  } else if (!user.installedApps) {
    // If user exists but doesn't have installedApps, add it
    user.installedApps = [];
    await user.save();
  }
  
  return user;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<UserI | null> {
  return User.findOne({ email: email.toLowerCase() });
}

// Export as a service object
export const UserService = {
  findOrCreateUser,
  getUserByEmail
};