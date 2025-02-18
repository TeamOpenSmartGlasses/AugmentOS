// import { UserI } from '@augmentos/types';
// import { User } from '../../models/user.model';
// import { systemApps } from '@augmentos/types/config/cloud.env';

// export async function findByEmail(email: string): Promise<UserI | null> {
//   const user = await User.findOne({ email });
//   if (user) return user;
//   return await User.findOne({ email: email.toLowerCase() });
// }

// export async function findById(id: string): Promise<UserI | null> {
//   return await User.findById(id);
// }

// export async function findOrCreateUser(email: string): Promise<UserI> {
//   email = email.toLowerCase();

//   const existingUser = await findByEmail(email);
//   if (existingUser) {
//     return existingUser;
//   }

//   return await User.create({
//     email,
//     runningAps: [
//       systemApps.dashboard.packageName,
//     ],
//   });
// }

// export async function updateUser(user: UserI, updates: Partial<UserI>): Promise<UserI | null> {
//   updates.email = user.email; // Prevent email from being updated.
//   updates._id = user._id; // Prevent _id from being updated.
//   return await User.findByIdAndUpdate(user, { $set: updates }, { new: true });
// }

// // Add new functions to service export
// export const userService = {
//   findByEmail,
//   findById,
//   findOrCreateUser,
//   updateUser,  
// };
