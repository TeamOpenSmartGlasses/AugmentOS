import { Box, Flex, Image, Stack, Text, rem, useMantineTheme } from "@mantine/core";
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
              : `Query: ${lastEntity?.query}`}
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
              Answer: {lastEntity.insight}
            </Text>
          )}
        </Stack>
      </Flex>
    </CardWrapper>
  );
};

export default ExplicitCard;