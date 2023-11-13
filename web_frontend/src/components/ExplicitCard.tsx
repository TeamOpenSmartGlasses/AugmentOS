import { Box, Image, Stack, Text, rem, useMantineTheme } from "@mantine/core";
import { Insight } from "../types";
import CardWrapper from "./CardWrapper";

interface ExplicitCardProps {
  entities: Insight[];
}

const ExplicitCard = ({entities}:ExplicitCardProps) => {
  const theme = useMantineTheme();
  const lastEntity = entities.at(-1);

  return (
    <CardWrapper large onClick={() => {}}>
      {!lastEntity?.insight && (
        <Box w={rem(237)} h={rem(237)} sx={{objectFit: "cover"}}>
          <Image src={"/explicit_blobs.gif"} />
        </Box>
      )}
      <Stack>
        {!lastEntity?.query ? (
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
            I'm listening...
          </Text>
        ) : (
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
        )}
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
            Answer: {lastEntity.insight}
          </Text>
        )}
      </Stack>
    </CardWrapper>
  );
};

export default ExplicitCard;