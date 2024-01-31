import { Text, useMantineTheme } from "@mantine/core";
import { AGENT_ICON_NAMES, AGENT_ICON_PATHS, AgentName } from "../types";
import CardWrapper from "./CardWrapper";
import { useRecoilValue } from "recoil";
import { explicitInsightsState } from "../recoil";

const ExplicitCard = () => {
  const theme = useMantineTheme();
  const explicitInsights = useRecoilValue(explicitInsightsState);
  const lastEntity = explicitInsights.at(-1);
  const queryString = `Query: ${lastEntity?.query}`;
  const answerString = `Answer: ${lastEntity?.insight}`;

  return (
    <CardWrapper
      large
      onClick={() => {}}
      agentName={AGENT_ICON_NAMES[AgentName.COMMAND]}
      agentIconSrc={AGENT_ICON_PATHS[AgentName.COMMAND]}
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
