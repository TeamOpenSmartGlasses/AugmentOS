// src/types/models/user.ts

export interface UserI {
  email: string;
  // Add any other user-specific fields here
}

export interface DeveloperI {
  email: string;
  apiKeys?: string[];  // For managing TPA development
  organizationId?: string;  // For future organization support
}