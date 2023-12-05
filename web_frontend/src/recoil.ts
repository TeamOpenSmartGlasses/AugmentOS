import { atom, selector, DefaultValue } from "recoil";
import { TranscriptionState } from "./types";

export const isExplicitListeningState = atom({
  key: "isExplicitListening",
  default: false,
});

const transcriptionState = atom<TranscriptionState>({
  key: "transcript",
  default: {
    isRecognizing: true,
    transcriptStartIdx: 0,
  },
});

/**
 * Type guard for Recoil's Default Value type.
 */
const isRecoilDefaultValue = (val: unknown): val is DefaultValue => {
  return val instanceof DefaultValue;
};

export const isRecognizingState = selector({
  key: "isRecognizing",
  get: ({ get }) => get(transcriptionState).isRecognizing,
  set: ({ set }, newVal) =>
    set(transcriptionState, (prevVal) => ({
      ...prevVal,
      isRecognizing: isRecoilDefaultValue(newVal) ? true : newVal,
    })),
});

export const transcriptStartIdxState = selector({
  key: "transcriptStartIdx",
  get: ({ get }) => get(transcriptionState).transcriptStartIdx,
  set: ({ set }, newVal) =>
    set(transcriptionState, (prevVal) => ({
      ...prevVal,
      transcriptStartIdx: isRecoilDefaultValue(newVal) ? 0 : newVal,
    })),
});
