import { atom } from "recoil";
import { Entity, Insight } from "./types";
import { generateRandomUserId } from "./utils/utils";

export const isExplicitListeningState = atom<boolean>({
  key: "isExplicitListening",
  default: false,
});

/**
 * Type guard for Recoil's Default Value type.
 */
// const isRecoilDefaultValue = (val: unknown): val is DefaultValue => {
//   return val instanceof DefaultValue;
// };

export const isRecognizingState = atom<boolean>({
  key: "isRecognizing",
  default: true,
});

export const entitiesState = atom<Entity[]>({
  key: "entities",
  default: [],
});

export const explicitInsightsState = atom<Insight[]>({
  key: "explicitInsights",
  default: [],
});

export const userIdState = atom<string>({
  key: "userId",
  default: generateRandomUserId(),
});

export const deviceIdState = atom<string>({
  key: "deviceId",
  default: "CSEWebFrontendDefault",
});

export const authTokenState = atom<string | undefined>({
  key: "authToken",
  default: undefined,
});
