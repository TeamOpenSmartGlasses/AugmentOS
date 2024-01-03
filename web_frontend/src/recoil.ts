import { atom, selector } from "recoil";
import { Entity, Insight, StudyCondition, TabChange } from "./types";
import { mockEntities } from "./mockData";

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
  default: mockEntities,
});

export const explicitInsightsState = atom<Insight[]>({
  key: "explicitInsights",
  default: [],
});

export const selectedCardIdState = atom<string | undefined>({
  key: "selectedCardId",
  default: undefined,
});

export const selectedEntityValue = selector<Entity | undefined>({
  key: "selectedEntity",
  get: ({ get }) => {
    return get(entitiesState).find(
      (entity) => entity.uuid === get(selectedCardIdState)
    );
  },
});

export const explorePaneUrlValue = selector<string | undefined>({
  key: "explorePaneUrl",
  get: ({ get }) => {
    return get(selectedEntityValue)?.url;
  },
});

export const showExplorePaneValue = selector<boolean>({
  key: "showExplorePane",
  get: ({ get }) => {
    return get(explorePaneUrlValue) !== undefined;
  },
});

export const videoTimeAtom = atom<undefined | number>({
  key: "videoTime",
  default: undefined,
});

export const tabChangesAtom = atom<TabChange[]>({
  key: "tabChanges",
  default: [],
});

export const studyConditionAtom = atom<undefined | StudyCondition>({
  key: "studyCondition",
  default: undefined,
});

export const googleSearchResultUrlAtom = atom<undefined | string>({
  key: "googleSearchUrl",
  default: undefined,
});
