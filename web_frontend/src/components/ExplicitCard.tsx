import { Stack, Text, rem, useMantineTheme } from "@mantine/core";
import { AGENT_ICON_NAMES, AGENT_ICON_PATHS, AgentName, Entity, Insight } from "../types";
import CardWrapper from "./CardWrapper";
import { uniqueId } from "lodash";
import { useEffect } from "react";

interface ExplicitCardProps {
  explicitInsights: Insight[];
  // HACK: setters to add a new ReferenceCard once we get the insight
  setExplicitInsights: React.Dispatch<React.SetStateAction<Insight[]>>;
  setEntities: React.Dispatch<React.SetStateAction<Entity[]>>;
  setIsExplicitListening: React.Dispatch<React.SetStateAction<boolean>>;
}

const ExplicitCard = ({
  explicitInsights,
  setEntities,
  setIsExplicitListening,
  setExplicitInsights,
}: ExplicitCardProps) => {
  const theme = useMantineTheme();
  const lastEntity = explicitInsights.at(-1);
  const queryString = `Query: ${lastEntity?.query}`;
  const answerString = `Answer: ${lastEntity?.insight}`;

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
      agentName={AGENT_ICON_NAMES[AgentName.COMMAND]}
      agentIconSrc={AGENT_ICON_PATHS[AgentName.COMMAND]}
      imageSrc="/explicit_blobs.gif"
      selected
    >
      <Stack my="auto">
        <Text
          size={rem(33)}
          sx={{
            wordWrap: "break-word",
            wordBreak: "break-word",
            overflowWrap: "break-word",
            color: theme.colors.bodyText,
            lineHeight: "150%",
          }}
        >
          {!lastEntity?.query ? "I'm listening..." : queryString}
        </Text>
        {lastEntity?.insight && (
          <Text
            size={rem(33)}
            sx={{
              wordWrap: "break-word",
              wordBreak: "break-word",
              overflowWrap: "break-word",
              color: theme.colors.bodyText,
              lineHeight: "150%",
            }}
          >
            {answerString}
          </Text>
        )}
      </Stack>
    </CardWrapper>
  );
};

export default ExplicitCard;