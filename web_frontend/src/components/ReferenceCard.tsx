import {
  Flex,
  Text,
  Image,
  Card,
  Title,
  createStyles,
  Group,
  rem,
  Stack,
} from "@mantine/core";
import { Entity } from "../types";

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
  cardId: string;
  selectedCardId: string;
  setSelectedCardId: React.Dispatch<React.SetStateAction<string>>;
  setViewMoreUrl: React.Dispatch<React.SetStateAction<string | undefined>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const AGENT_ICON_PATHS: Record<string, string> = {
  "Statistician": "/statistician_agent_avatar.jpg",
  "FactChecker": "/fact_checker_agent_avatar.jpg",
  "DevilsAdvocate": "/devils_advocate_agent_avatar.jpg",
};

const ReferenceCard = ({
  entity,
  setViewMoreUrl,
  cardId,
  selectedCardId,
  setSelectedCardId,
  setLoading,
}: ReferenceCardProps) => {
  const { classes, theme } = useStyles();
  const selected = cardId === selectedCardId;

  const getImageUrl = (entity: Entity) => {
    if (entity.map_image_path) {
      return `${import.meta.env.VITE_BACKEND_BASE_URL}/${
        entity.map_image_path
      }`;
    }
    return entity.image_url;
  };

  const handleSelectCard = () => {
    setSelectedCardId(cardId);
    setViewMoreUrl(entity.url);
    setLoading(true);
  };

  return (
    <Card
      radius="md"
      p={0}
      h={"max-content"}
      onClick={handleSelectCard}
      className={classes.card}
    >
      <Flex align={"center"} h={"100%"}>
        {(entity.image_url || entity.map_image_path) && (
          <Image
            src={getImageUrl(entity)}
            height={"100%"}
            width={120}
            radius="md"
          />
        )}
        <Stack
          p={"lg"}
          h="max-content"
          w="100%"
          justify={"center"}
        >
          <Title
            fz="lg"
            size="2rem"
            sx={{
              wordWrap: "break-word",
              wordBreak: "break-word",
              overflowWrap: "break-word",
            }}
          >
            {entity.summary || entity.agent_insight}
          </Title>
          <Group mt="auto">
            {entity.agent_name && (
              <Text
                sx={{
                  textTransform: "uppercase",
                }}
                fw="bold"
                ml="auto"
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
