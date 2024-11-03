import { Text, useMantineTheme } from "@mantine/core";
import { AGENT_ICON_NAMES, AGENT_ICON_PATHS, AgentName } from "../types";
import CardWrapper from "./CardWrapper";
import { uniqueId } from "lodash";
import { useEffect } from "react";
import { useRecoilState, useSetRecoilState } from "recoil";
import {
  entitiesState,
  explicitInsightsState,
  isExplicitListeningState,
} from "../recoil";

const ExplicitCard = () => {
  const theme = useMantineTheme();
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

  return (
    <CardWrapper
      large
      onClick={() => {}}
      agentName={AGENT_ICON_NAMES[AgentName.COMMAND] ?? AGENT_ICON_NAMES[AgentName.DEFAULT]}
      agentIconSrc={AGENT_ICON_PATHS[AgentName.COMMAND] ?? AGENT_ICON_PATHS[AgentName.DEFAULT]}
      imageSrc="/explicit_blobs.gif"
      selected
    >
      <Text
        sx={{
          wordWrap: "break-word",
          wordBreak: "break-word",
          overflowWrap: "break-word",
          color: theme.colors.bodyText,
          lineHeight: "150%",
        }}
      >
        {!lastEntity?.query ? "I'm listening..." : queryString}
        <br />
        {lastEntity?.insight && answerString}
      </Text>
    </CardWrapper>
  );
};

export default ExplicitCard;
