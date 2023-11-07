import { Card, Flex, Image, Stack, Text, rem, useMantineTheme } from "@mantine/core";
import { Insight } from "../types";

interface ExplicitCardProps {
  entities: Insight[];
}

const ExplicitCard = ({entities}:ExplicitCardProps) => {
  const theme = useMantineTheme();
  const lastEntity = entities.at(-1);
  const hasQuery = lastEntity && lastEntity.query !== undefined && lastEntity.query !== "";
  const hasInsight = lastEntity && lastEntity.insight !== undefined;

  return (
    <Card radius="md" p={0} h={"36vh"} mb={"2.5rem"}>
      {JSON.stringify(entities)}
      <Flex>
          <Image src={"/explicit_blobs.gif"}/>
        <Stack>
          {/* {hasQuery && ( */}
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
      </Flex>
    </Card>
  );
};

export default ExplicitCard;