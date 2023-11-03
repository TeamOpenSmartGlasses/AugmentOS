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
  UnstyledButton,
} from "@mantine/core";
import { AgentName, Entity } from "../types";
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
    border: `1.5px solid ${theme.colors.outlineBlue}`,
    borderRadius: rem(30),
  },

  button: {
    color: theme.colors.convoscopeBlue,
    paddingLeft: rem(8),
    paddingRight: rem(8),
    paddingTop: rem(8),
    paddingBottom: rem(5),
    borderRadius: rem(12),
    border: `1.5px solid ${theme.colors.outlineBlue}`,
    ":active": {
      translate: "0 2px",
    }
  }
}));

interface ReferenceCardProps {
  entity: Entity;
  selected?: boolean;
  onClick: () => void;
  large?: boolean;
}

const AGENT_ICON_PATHS: Record<AgentName, string> = {
  [AgentName.STATISTICIAN]: "/statistician_icon_large.svg",
  [AgentName.FACT_CHECKER]: "/fact_checker_icon_large.svg",
  [AgentName.DEVILS_ADVOCATE]: "/devils_icon_large.svg",
  [AgentName.DEFINER]: "/definer_icon_large.svg",
};

const AGENT_ICON_NAMES: Record<AgentName, string> = {
  [AgentName.STATISTICIAN]: "Statistician",
  [AgentName.FACT_CHECKER]: "Fact Checker",
  [AgentName.DEVILS_ADVOCATE]: "Devil's Advocate",
  [AgentName.DEFINER]: "Definer",
};

const ReferenceCard = ({
  entity,
  selected = false,
  onClick,
  large = false,
}: ReferenceCardProps) => {
  const theme = useMantineTheme();
  const { classes } = useStyles();

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
      h={large ? "30vh" : "20vh"}
      mb={"2.5rem"}
      onClick={onClick}
      className={classes.card}
      sx={{ ...(selected && { filter: "brightness(1.2)" }) }}
    >
      <Flex align={"center"} h={"100%"}>
        {(entity.image_url || entity.map_image_path) && (
          <Box
            sx={{
              borderRadius: rem(30),
              flex: `1 1 ${large ? 180 : 120}px`,
              objectFit: "cover",
              overflow: "clip",
              height: "100%",
              "& > div, & > div > figure, & > div > figure > div": {
                height: "100%",
              },
              background: "white",
            }}
          >
            <Image src={getImageUrl(entity)} fit="cover" height="100%" />
          </Box>
        )}
        <Stack
          p={"lg"}
          pl="3rem"
          h="100%"
          w="100%"
          sx={{ flex: "10 1 0" }}
          justify={"center"}
        >
          <Group noWrap align="start">
            <Text
              size={rem(33)}
              sx={{
                wordWrap: "break-word",
                wordBreak: "break-word",
                overflowWrap: "break-word",
                color: theme.colors.bodyText,
              }}
            >
              {/* if there is an entity.name, show the Definer card format. Otherwise show the agent insight */}
              {entity.name
                ? `${entity.name}: ${entity.summary}`
                : entity.agent_insight}
            </Text>
            <ThumbButtons />
          </Group>
          <Group mt="auto">
            <Text
              transform="uppercase"
              fw="bold"
              ml="auto"
              size={rem(22)}
              sx={{ letterSpacing: rem(1.1) }}
            >
              {AGENT_ICON_NAMES[entity.agent_name ?? AgentName.DEFINER]}
            </Text>
            <Image
              src={AGENT_ICON_PATHS[entity.agent_name ?? AgentName.DEFINER]}
              height={large ? rem(50) : rem(40)}
              width={large ? rem(50) : rem(40)}
              radius="md"
            />
          </Group>
        </Stack>
      </Flex>
    </Card>
  );
};

export default ReferenceCard;

const ThumbButtons = () => {
  const { classes } = useStyles();
  const [thumbState, setThumbState] = useState<"up" | "down" | undefined>();

  return (
    <Group ml="auto" noWrap>
      <UnstyledButton
        className={classes.button}
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
      </UnstyledButton>
      <UnstyledButton
        className={classes.button}
        onClick={(e) => {
          e.stopPropagation();
          setThumbState(thumbState === "down" ? undefined : "down");
        }}
      >
        {thumbState === "down" ? (
          <IconThumbDownFilled
            size="2rem"
            stroke={1.5}
            style={{ transform: "scaleX(-1)" }}
          />
        ) : (
          <IconThumbDown
            size="2rem"
            stroke={1.5}
            style={{ transform: "scaleX(-1)" }}
          />
        )}
      </UnstyledButton>
    </Group>
  );
}