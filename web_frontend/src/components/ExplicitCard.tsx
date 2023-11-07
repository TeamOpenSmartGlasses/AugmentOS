import { Image, Stack, Text, rem, useMantineTheme } from "@mantine/core";
import { Insight } from "../types";
import CardWrapper from "./CardWrapper";

interface ExplicitCardProps {
  entities: Insight[];
}

const ExplicitCard = ({entities}:ExplicitCardProps) => {
  const theme = useMantineTheme();
  const lastEntity = entities.at(-1);
  const hasQuery = lastEntity && lastEntity.query !== undefined && lastEntity.query !== "";
  const hasInsight = lastEntity && lastEntity.insight !== undefined;

  return (
    <CardWrapper large onClick={() => {}}>
      <Image src={"/explicit_blobs.gif"} />
      <Stack>
        {/* {hasQuery && ( */}
        {JSON.stringify(entities)}
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
          Query: {lastEntity?.query}
        </Text>
        {/* )} */}
        {/* {hasInsight && ( */}
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
          Answer: {lastEntity?.insight ?? "I'm thinking..."}
        </Text>
        {/* )} */}
      </Stack>
    </CardWrapper>
  );
};

export default ExplicitCard;