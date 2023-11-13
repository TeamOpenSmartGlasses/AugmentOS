import { Box, Flex, Image, Stack, Text, rem, useMantineTheme } from "@mantine/core";
import { AgentName, Entity, Insight } from "../types";
import CardWrapper from "./CardWrapper";
import { uniqueId } from "lodash";

interface ExplicitCardProps {
  explicitInsights: Insight[];
  // HACK: setters to add a new ReferenceCard once we get the insight
  setEntities: React.Dispatch<React.SetStateAction<Entity[]>>;
  setIsExplicitListening: React.Dispatch<React.SetStateAction<boolean>>;
}

const ExplicitCard = ({explicitInsights, setEntities, setIsExplicitListening}:ExplicitCardProps) => {
  const theme = useMantineTheme();
  const lastEntity = explicitInsights.at(-1);
  const queryString = `Query: ${lastEntity?.query}`;
  const answerString = `Answer: ${lastEntity?.insight}`;

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
  }

  return (
    <CardWrapper large onClick={() => {}}>
      <Flex px={rem(60)} gap={rem(52)}>
        {!lastEntity?.insight && (
          <Box
            w={rem(237)}
            h={rem(237)}
            sx={{ overflow: "hidden", borderRadius: 999 }}
          >
            <Image src={"/explicit_blobs.gif"} sx={{ scale: "8" }} />
          </Box>
        )}
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
            {!lastEntity?.query
              ? "I'm listening..."
              : queryString}
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
      </Flex>
    </CardWrapper>
  );
};

export default ExplicitCard;