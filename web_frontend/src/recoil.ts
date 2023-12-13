import { atom } from "recoil";

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
