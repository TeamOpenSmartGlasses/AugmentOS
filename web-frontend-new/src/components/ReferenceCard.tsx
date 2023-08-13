import {
  Flex,
  Text,
  Image,
  Card,
  Title,
  UnstyledButton,
  createStyles,
} from "@mantine/core";
import { Entity } from "../types";

const useStyles = createStyles((theme) => ({
  card: {
    marginBottom: "1rem",
    ":last-child": { marginBottom: 0 },
    backgroundColor: theme.white,
  },
}));

interface ReferenceCardProps {
  entity: Entity;
  setViewMoreUrl: React.Dispatch<React.SetStateAction<string | undefined>>;
}

const ReferenceCard = ({ entity, setViewMoreUrl }: ReferenceCardProps) => {
  const { classes } = useStyles();

  const getImageUrl = (entity: Entity) => {
    if (entity.map_image_path) {
      return entity.map_image_path;
    }
    return entity.image_url;
  };

  return (
    <Card withBorder radius="md" p={0} className={classes.card}>
      <Flex gap={"1rem"} align={"center"}>
        <Image src={getImageUrl(entity)} height={120} width={120} />
        <Flex direction={"column"} pr={"lg"}>
          <Title order={2}>{entity.name}</Title>
          <Text
            fz="lg"
            sx={{
              wordWrap: "break-word",
              wordBreak: "break-word",
              overflowWrap: "break-word",
            }}
          >
            {entity.summary}
            <UnstyledButton>
              <Text
                fz="lg"
                sx={{
                  marginLeft: "0.5rem",
                  textDecoration: "underline",
                }}
                onClick={() => setViewMoreUrl(entity.url)}
              >
                Read more
              </Text>
            </UnstyledButton>
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
};

export default ReferenceCard;
