import {
  Text,
  createStyles,
  Group,
  rem,
  useMantineTheme,
  Box,
  UnstyledButton,
} from "@mantine/core";
import { AGENT_ICON_NAMES, AGENT_ICON_PATHS, AgentName, Entity } from "../types";
import { IconThumbDown, IconThumbDownFilled, IconThumbUp, IconThumbUpFilled } from "@tabler/icons-react";
import { useState } from "react";
import CardWrapper, { CardWrapperProps } from "./CardWrapper";

const useStyles = createStyles((theme) => ({
  button: {
    color: theme.colors.convoscopeBlue,
    paddingLeft: rem(8),
    paddingRight: rem(8),
    paddingTop: rem(8),
    paddingBottom: rem(5),
    borderRadius: rem(12),
    border: `1.5px solid ${theme.colors.cardStroke}`,
    ":active": {
      translate: "0 2px",
    },
  },
}));

interface ReferenceCardProps
  extends Omit<CardWrapperProps, "agentName" | "agentIconSrc"> {
  entity: Entity;
}

const ReferenceCard = ({
  entity,
  selected = false,
  onClick,
  large = false,
  pointer = false,
}: ReferenceCardProps) => {
  const theme = useMantineTheme();

  const getImageUrl = (entity: Entity) => {
    if (entity.map_image_path) {
      return `${import.meta.env.VITE_BACKEND_BASE_URL}/${entity.map_image_path
        }`;
    }
    return entity.image_url;
  };

  return (
    <CardWrapper
      onClick={onClick}
      selected={selected}
      large={large}
      pointer={pointer}
      imageSrc={
        entity.image_url || entity.map_image_path
          ? getImageUrl(entity)
          : undefined
      }
      agentName={AGENT_ICON_NAMES[entity.agent_name ?? AgentName.DEFINER]}
      agentIconSrc={AGENT_ICON_PATHS[entity.agent_name ?? AgentName.DEFINER]}
    >
      <Box sx={{ float: "right" }}>
        <ThumbButtons />
      </Box>
      <Text
        size={rem(33)}
        pl="sm"
        sx={{
          wordWrap: "break-word",
          wordBreak: "break-word",
          overflowWrap: "break-word",
          color: theme.colors.bodyText,
          lineHeight: "150%",
          whiteSpace: "pre-line",
        }}
      >
        {/* if there is an entity.name, show the Definer card format. Otherwise show the agent insight */}
        {entity.name
          ? `${entity.name}: ${entity.summary}`
          : entity.agent_insight}
      </Text>
      {/* make label stick to bottom-right corner */}
    </CardWrapper>
  );
};

export default ReferenceCard;

const ThumbButtons = () => {
  const { classes } = useStyles();
  const [thumbState, setThumbState] = useState<"up" | "down" | undefined>();

  return (
    <Group noWrap pl="xs" pb="xs">
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