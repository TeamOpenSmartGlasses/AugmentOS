// website/src/services/user.service.ts
import { User } from "../models/user.model";
import dotenv from "dotenv";
import jwt from 'jsonwebtoken';
import { UserI } from "../types/augment-os.types";

dotenv.config();
const JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY;

export async function findByEmail(email: string): Promise<UserI | null> {
  const user = await User.findOne({email: email});
  if (user) return user;

  return await User.findOne({ email: email.toLowerCase() });
}

export async function findById(id: string): Promise<UserI | null> {
  return await User.findById(id);
}

export async function createUser(email: string): Promise<UserI> {
  email = email.toLowerCase();

  const _user: UserI | null = await findByEmail(email);
  if (_user) throw "There is already a user with the email: " + email;

  return await User.create({ email });
}

export async function getJwtFromUser(user: UserI): Promise<string> {
  if (!JWT_PRIVATE_KEY) throw "process.env.JWT_PRIVATE_KEY is not defined!";
  return jwt.sign({ _id: user._id }, JWT_PRIVATE_KEY);
}

export async function getUserFromJwt(token: string): Promise<UserI> {
  if (!JWT_PRIVATE_KEY) throw "process.env.JWT_PRIVATE_KEY is not defined!";
  const jwtPayload = jwt.verify(token, JWT_PRIVATE_KEY);
  const user = await User.findById((<UserI>jwtPayload)._id);
  if (!user) throw "User not found";
  return user;
}