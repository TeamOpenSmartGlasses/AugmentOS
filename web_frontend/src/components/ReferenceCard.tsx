import {
  Flex,
  Text,
  Image,
  Card,
  createStyles,
  Group,
  rem,
  Stack,
  useMantineTheme,
  Box,
  ActionIcon,
} from "@mantine/core";
import { Entity } from "../types";
import { IconThumbDown, IconThumbDownFilled, IconThumbUp, IconThumbUpFilled } from "@tabler/icons-react";
import { useState } from "react";

const useStyles = createStyles((theme) => ({
  card: {
    height: 120,
    marginTop: "1rem",
    ":first-of-type": { marginTop: 0 },
    backgroundColor: theme.colors.cardFill,
    ":hover": {
      filter: "brightness(1.2)",
    },
    color: theme.colors.titleText,
  },
}));

interface ReferenceCardProps {
  entity: Entity;
  selected?: boolean;
  onClick: () => void;
}

const AGENT_ICON_PATHS: Record<string, string> = {
  "Statistician": "/statistician_agent_avatar.jpg",
  "FactChecker": "/fact_checker_agent_avatar.jpg",
  "DevilsAdvocate": "/devils_advocate_agent_avatar.jpg",
};

const ReferenceCard = ({
  entity,
  selected = false,
  onClick,
}: ReferenceCardProps) => {
  const theme = useMantineTheme();
  const { classes } = useStyles();

  const [thumbState, setThumbState] = useState<"up" | "down" | undefined>();

  const getImageUrl = (entity: Entity) => {
    if (entity.map_image_path) {
      return `${import.meta.env.VITE_BACKEND_BASE_URL}/${
        entity.map_image_path
      }`;
    }
    return entity.image_url;
  };

  return (
    <Card
      radius="md"
      p={0}
      h={"22rem"}
      onClick={onClick}
      className={classes.card}
      withBorder
      sx={{ ...(selected && { filter: "brightness(1.2)" }) }}
    >
      <Flex align={"center"} h={"100%"}>
        {(entity.image_url || entity.map_image_path) && (
          <Box
            sx={{
              borderRadius: "0.5rem",
              flex: "1 1 120px",
              objectFit: "cover",
              overflow: "clip",
              height: "100%",
              "& > div, & > div > figure, & > div > figure > div": {
                height: "100%",
              },
            }}
          >
            <Image src={getImageUrl(entity)} fit="cover" height="100%" />
          </Box>
        )}
        <Stack
          p={"lg"}
          h="100%"
          w="100%"
          sx={{ flex: "10 1 0" }}
          justify={"center"}
        >
          <Group ml="auto">
            <ActionIcon
              onClick={(e) => {
                e.stopPropagation();
                setThumbState(thumbState === "up" ? undefined : "up");
              }}
            >
              {thumbState === "up" ? (
                <IconThumbUpFilled size="2rem" stroke={1.5} />
              ) : (
                <IconThumbUp size="2rem" stroke={1.5} />
              )}
            </ActionIcon>
            <ActionIcon
              onClick={(e) => {
                e.stopPropagation();
                setThumbState(thumbState === "down" ? undefined : "down");
              }}
            >
              {thumbState === "down" ? (
                <IconThumbDownFilled size="2rem" stroke={1.5} />
              ) : (
                <IconThumbDown size="2rem" stroke={1.5} />
              )}
            </ActionIcon>
          </Group>
          <Text
            fw={"bold"}
            size="2rem"
            sx={{
              wordWrap: "break-word",
              wordBreak: "break-word",
              overflowWrap: "break-word",
            }}
          >
            {entity.summary || entity.agent_insight}
          </Text>
          <Group mt="auto">
            {entity.agent_name && (
              <Text
                sx={{
                  textTransform: "uppercase",
                }}
                fw="bold"
                ml="auto"
                size={rem(20)}
                color={theme.colors.bodyText}
              >
                {entity.agent_name}
              </Text>
            )}
            {entity.agent_name && (
              <Image
                src={AGENT_ICON_PATHS[entity.agent_name]}
                height={rem(50)}
                width={rem(50)}
                radius="md"
              />
            )}
          </Group>
        </Stack>
      </Flex>
    </Card>
  );
};

export default ReferenceCard;
