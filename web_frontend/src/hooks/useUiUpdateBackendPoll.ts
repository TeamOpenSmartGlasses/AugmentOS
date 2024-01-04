import { useEffect } from "react";
import axiosClient from "../axiosConfig";
import { UI_POLL_ENDPOINT } from "../serverEndpoints";
import { Entity, Insight } from "../types";
import { useSetRecoilState } from "recoil";
import {
  entitiesState,
  explicitInsightsState,
  isExplicitListeningState,
} from "../recoil";
import {
  ENABLE_NOTIFICATION_SOUNDS,
  NOTIFICATION_FILEPATH,
} from "../constants";

/**
 * poll the backend for UI updates and update state of entities and explicit insights
 */
export const useUiUpdateBackendPoll = () => {
  const setEntities = useSetRecoilState(entitiesState);
  const setExplicitInsights = useSetRecoilState(explicitInsightsState);
  const setIsExplicitListening = useSetRecoilState(isExplicitListeningState);

  useEffect(() => {
    const updateUiBackendPoll = () => {
      const uiPollRequstBody = {
        features: [
          "contextual_search_engine",
          "proactive_agent_insights",
          "explicit_agent_insights",
          "intelligent_entity_definitions",
          "agent_chat",
        ], //list of features here
        userId: window.userId,
        deviceId: window.deviceId,
      };

      axiosClient
        .post(UI_POLL_ENDPOINT, uiPollRequstBody)
        .then((res) => {
          if (res.data.success) {
            const newEntities = res.data.result as Entity[];
            const newInsights =
              (res.data.results_proactive_agent_insights as Entity[]) || [];
            const newExplicitQueries =
              (res.data.explicit_insight_queries as Insight[]) || [];
            const newExplicitInsights =
              (res.data.explicit_insight_results as Insight[]) || [];
            const newProactiveDefinitions =
              (res.data.entity_definitions as Entity[]) || [];

            if (JSON.stringify(newProactiveDefinitions) == JSON.stringify([])) {
              //console.log("THOSE DEFINS THO");
              //console.log(newProactiveDefinitions);
            }

            if (res.data.wake_word_time !== -1) {
              setIsExplicitListening(true);
            }

            if (
              newEntities.length === 0 &&
              newInsights.length === 0 &&
              newExplicitQueries.length === 0 &&
              newExplicitInsights.length === 0 &&
              newProactiveDefinitions.length === 0
            )
              return;

            if (ENABLE_NOTIFICATION_SOUNDS) {
              new Audio(NOTIFICATION_FILEPATH).play();
            }

            setEntities((entities) =>
              [
                ...entities,
                ...newEntities,
                ...newInsights,
                ...newProactiveDefinitions,
              ].filter((e) => {
                if (e == null || e == undefined) {
                  console.log("NULL ENTITY FOUND");
                  return false;
                }
                return true;
              })
            );

            setExplicitInsights((explicitInsights) => [
              ...explicitInsights,
              ...newExplicitQueries,
              ...newExplicitInsights,
            ]);
          }
        })
        .catch(function (error) {
          console.error(error);
        });
    };
    setInterval(updateUiBackendPoll, 200);
  }, [setEntities, setExplicitInsights, setIsExplicitListening]);
};
