import {
  Flex,
  Text,
  Image,
  Card,
  Title,
  UnstyledButton,
  createStyles,
  Box,
} from "@mantine/core";
import { Entity } from "../types";

const useStyles = createStyles((theme) => ({
  card: {
    height: 120,
    marginTop: "1rem",
    ":first-child": { marginTop: 0 },
    backgroundColor: theme.white,
    ":hover": {
      opacity: 0.75,
    },
  },
}));

interface ReferenceCardProps {
  entity: Entity;
  cardId: string;
  selectedCardId: string;
  setSelectedCardId: React.Dispatch<React.SetStateAction<string>>;
  setViewMoreUrl: React.Dispatch<React.SetStateAction<string | undefined>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  openModal: () => void;
}

const ReferenceCard = ({
  entity,
  setViewMoreUrl,
  cardId,
  selectedCardId,
  setSelectedCardId,
  setLoading,
  openModal,
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
    openModal()
  };

  return (
    <Card
      withBorder
      radius="md"
      p={0}
      h={"max-content"}
      onClick={handleSelectCard}
      className={classes.card}
      sx={{
        color: selected ? theme.colors.indigo[9] : "black",
      }}
    >
      <Flex gap={"1rem"} align={"center"} h={"100%"}>
        {entity.image_url || entity.map_image_path ? (
          <Image src={getImageUrl(entity)} height={120} width={120} />
        ) : (
          <Box ml={"1rem"}></Box>
        )}
        <Flex
          direction={"column"}
          pr={"lg"}
          h={"100%"}
          justify={"center"}
          py={entity.image_url || entity.map_image_path ? 0 : 10}
        >
          <Title order={2} lineClamp={1}>
            {entity.name}
          </Title>
          <Text
            fz="lg"
            sx={{
              wordWrap: "break-word",
              wordBreak: "break-word",
              overflowWrap: "break-word",
            }}
          >
            {entity.summary}
            {entity.url && (
              <UnstyledButton>
                <Text
                  fz="lg"
                  sx={{
                    marginLeft: "0.5rem",
                    textDecoration: "underline",
                  }}
                  color={selected ? "white" : "black"}
                  onClick={handleSelectCard}
                >
                  Read more
                </Text>
              </UnstyledButton>
            )}
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
};

export default ReferenceCard;
