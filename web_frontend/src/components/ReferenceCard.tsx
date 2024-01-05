import { Text, useMantineTheme } from "@mantine/core";
import {
  AGENT_ICON_NAMES,
  AGENT_ICON_PATHS,
  AgentName,
  Entity,
} from "../types";
import CardWrapper, { CardWrapperProps } from "./CardWrapper";

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
  showLabel,
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
      showLabel={showLabel}
    >
      {/*
      <Box sx={{ float: "right" }}>
        <ThumbButtons entity={entity} />
      </Box>
    */}
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
    </CardWrapper>
  );
};

export default ReferenceCard;
