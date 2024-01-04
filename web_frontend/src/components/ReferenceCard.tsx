import {
  Text,
  createStyles,
  Group,
  rem,
  useMantineTheme,
  Box,
  UnstyledButton,
} from "@mantine/core";
import {
  AGENT_ICON_NAMES,
  AGENT_ICON_PATHS,
  AgentName,
  Entity,
} from "../types";
import {
  IconThumbDown,
  IconThumbDownFilled,
  IconThumbUp,
  IconThumbUpFilled,
} from "@tabler/icons-react";
import { useState } from "react";
import CardWrapper, { CardWrapperProps } from "./CardWrapper";
import axiosClient from "../axiosConfig";
import { RATE_INSIGHT_ENDPOINT } from "../serverEndpoints";

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

const rateInsight = (entity: Entity, newState: ThumbState) => {
  let rating = -1;
  if (newState == ThumbState.UP) rating = 10;
  if (newState == ThumbState.DOWN) rating = 0;
  if (rating == -1) return;

  const rateInsightRequestBody = {
    userId: window.userId,
    resultUuid: entity.uuid,
    rating: rating,
  };

  axiosClient
    .post(RATE_INSIGHT_ENDPOINT, rateInsightRequestBody)
    .then((res) => {
      if (res.data.success) {
        console.log("Successfully rated card");
      }
    })
    .catch(function (error) {
      console.error(error);
    });
};
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
      return `${import.meta.env.VITE_BACKEND_BASE_URL}/${
        entity.map_image_path
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
        <ThumbButtons entity={entity} />
      </Box>
      <Text
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

enum ThumbState {
  UP,
  DOWN,
  UNSET,
}

const ThumbButtons = ({ entity }: { entity: Entity }) => {
  const { classes } = useStyles();
  const [thumbState, setThumbState] = useState<ThumbState>();

  return (
    <Group noWrap pl="xs" pb="xs">
      <UnstyledButton
        className={classes.button}
        onClick={(e) => {
          e.stopPropagation();
          setThumbState((prevState) => {
            const newState =
              prevState === ThumbState.UP ? ThumbState.UNSET : ThumbState.UP;
            rateInsight(entity, newState);
            return newState;
          });
        }}
      >
        {thumbState === ThumbState.UP ? (
          <IconThumbUpFilled size="3vh" stroke={1.5} />
        ) : (
          <IconThumbUp size="3vh" stroke={1.5} />
        )}
      </UnstyledButton>
      <UnstyledButton
        className={classes.button}
        onClick={(e) => {
          e.stopPropagation();
          setThumbState((prevState) => {
            const newState =
              prevState === ThumbState.DOWN
                ? ThumbState.UNSET
                : ThumbState.DOWN;
            rateInsight(entity, newState);
            return newState;
          });
        }}
      >
        {thumbState === ThumbState.DOWN ? (
          <IconThumbDownFilled
            size="3vh"
            stroke={1.5}
            style={{ transform: "scaleX(-1)" }}
          />
        ) : (
          <IconThumbDown
            size="3vh"
            stroke={1.5}
            style={{ transform: "scaleX(-1)" }}
          />
        )}
      </UnstyledButton>
    </Group>
  );
};
