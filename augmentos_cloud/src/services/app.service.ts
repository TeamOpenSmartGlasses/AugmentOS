// backend/src/services/app.service.ts

import { AppI } from "../types";

const TPAs: AppI[] = [
  {
    appId: "org.mentra.captions",
    name: "Captions",
    description: "Constants Live captions from your device microphone",
    webhookURL: "http://localhost:7010/webhook",
    logoURL: "http://localhost:7010/logo.png",
  },
  {
    appId: "org.mentra.flash",
    name: "Flash",
    description: "Welcome to the future",

    webhookURL: "http://localhost:7011/webhook",
    logoURL: "http://localhost:7011/logo.png",
  },
];

// For now hard code the TPAs. in the future we can have the system TPAs and also fetch more from database.
async function getAllApps(): Promise<AppI[]> {
  return TPAs;
}

async function getApp(appId: string): Promise<AppI | undefined> {
  return TPAs.find((a) => a.appId === appId);
}

async function createApp(app: AppI): Promise<AppI> {
  // Ensure the appId is unique.
  if (TPAs.find((a) => a.appId === app.appId)) {
    throw new Error(`App with that appId already exists ${app.appId}`);
  }

  TPAs.push(app);
  return app;
}

export const AppService = { getAllApps, createApp, getApp };
export default AppService;