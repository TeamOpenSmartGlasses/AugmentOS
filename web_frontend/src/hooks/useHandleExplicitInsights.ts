import { uniqueId } from "lodash";
import { useEffect } from "react";
import { useRecoilState, useSetRecoilState } from "recoil";
import {
  explicitInsightsState,
  entitiesState,
  isExplicitListeningState,
} from "../recoil";
import { AgentName } from "../types";

export const useHandleExplicitInsights = () => {
  const [explicitInsights, setExplicitInsights] = useRecoilState(
    explicitInsightsState
  );
  const setEntities = useSetRecoilState(entitiesState);
  const lastEntity = explicitInsights.at(-1);
  const queryString = `Query: ${lastEntity?.query}`;
  const answerString = `Answer: ${lastEntity?.insight}`;
  const setIsExplicitListening = useSetRecoilState(isExplicitListeningState);

  useEffect(() => {
    if (lastEntity?.insight) {
      setEntities((prevEntities) => [
        ...prevEntities,
        {
          uuid: uniqueId(),
          agent_insight: `${queryString}\n${answerString}`,
          agent_name: AgentName.COMMAND,
        },
      ]);
      setIsExplicitListening(false);
      setExplicitInsights([]);
    }
  }, [
    answerString,
    lastEntity?.insight,
    queryString,
    setEntities,
    setExplicitInsights,
    setIsExplicitListening,
  ]);
};
