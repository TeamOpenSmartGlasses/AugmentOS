import {
  Text,
  Image,
  createStyles,
  Group,
  rem,
  useMantineTheme,
  Box,
  UnstyledButton,
} from "@mantine/core";
import { AgentName, Entity } from "../types";
import { IconThumbDown, IconThumbDownFilled, IconThumbUp, IconThumbUpFilled } from "@tabler/icons-react";
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


const rateInsight = (entity: Entity, newState) => {

  let rating = -1;
  if (newState == "up") rating = 10;
  if (newState == "down") rating = 0;
  if (rating == -1) return;

  const rateInsightRequestBody = {
    userId: window.userId,
    resultUuid:  entity.uuid,
    rating: rating
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
}
interface ReferenceCardProps extends CardWrapperProps {
  entity: Entity;
}

const AGENT_ICON_PATHS: Record<AgentName, string> = {
  [AgentName.STATISTICIAN]: "/statistician_icon_large.svg",
  [AgentName.FACT_CHECKER]: "/fact_checker_icon_large.svg",
  [AgentName.DEVILS_ADVOCATE]: "/devils_icon_large.svg",
  [AgentName.DEFINER]: "/definer_icon_large.svg",
  [AgentName.COMMAND]: "/dial_icon_large.svg",
};

const AGENT_ICON_NAMES: Record<AgentName, string> = {
  [AgentName.STATISTICIAN]: "Statistician",
  [AgentName.FACT_CHECKER]: "Fact Checker",
  [AgentName.DEVILS_ADVOCATE]: "Devil's Advocate",
  [AgentName.DEFINER]: "Definer",
  [AgentName.COMMAND]: "Command",
};

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
    >
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
      <Box p={"lg"} h="100%" w="100%" sx={{ flex: "10 1 0" }}>
        <Box sx={{ float: "right" }}>
          <ThumbButtons entity={entity} />
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
        <Group p="lg" sx={{ bottom: 0, right: 0, position: "absolute" }}>
          <Text
            transform="uppercase"
            fw="bold"
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
      </Box>
    </CardWrapper>
  );
};

export default ReferenceCard;

const ThumbButtons = ({ entity }) => {
  const { classes } = useStyles();
  const [thumbState, setThumbState] = useState<"up" | "down" | undefined>();

  return (
    <Group noWrap pl="xs" pb="xs">
      <UnstyledButton
        className={classes.button}
        onClick={(e) => {
          e.stopPropagation();
          setThumbState(prevState => {
            const newState = prevState === "up" ? undefined : "up";
            rateInsight(entity, newState)
            return newState;
          })
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
          setThumbState(prevState => {
            const newState = prevState === "down" ? undefined : "down";
            rateInsight(entity, newState)
            return newState;
          })
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