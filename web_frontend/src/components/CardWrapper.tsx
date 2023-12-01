import {
  Flex,
  Card,
  createStyles,
  rem,
  Box,
  Image,
  Group,
  Text,
} from "@mantine/core";
import { PropsWithChildren } from "react";

const useStyles = createStyles((theme) => ({
  card: {
    marginTop: "1rem",
    ":first-of-type": { marginTop: 0 },
    marginBottom: "2.5rem",
    backgroundColor: theme.colors.cardFill,
    ":hover": {
      filter: "brightness(1.2)",
    },
    color: theme.colors.titleText,
    border: `1.5px solid ${theme.colors.cardStroke}`,
    borderRadius: rem(30),
    boxShadow: "15px 15px 40px 0px rgba(0, 0, 0, 0.40)"
  },
}));

export interface CardWrapperProps {
  selected?: boolean;
  onClick: () => void;
  large?: boolean;
  pointer?: boolean;
  imageSrc?: string;
  agentName: string;
  agentIconSrc: string;
  imageScale?: number;
}

const CardWrapper = ({
  selected = false,
  onClick,
  large = false,
  children,
  pointer = false,
  imageSrc,
  agentName,
  agentIconSrc,
  imageScale = 1
}: PropsWithChildren<CardWrapperProps>) => {
  const { classes } = useStyles();

  return (
    <Card
      radius="md"
      p={0}
      h={large ? "36vh" : "24vh"}
      onClick={onClick}
      className={classes.card}
      sx={{
        ...(selected && { filter: "brightness(1.2)" }),
        ...(pointer && { cursor: "pointer" }),
      }}
    >
      <Flex align={"center"} h={"100%"}>
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
          <Image
            src={imageSrc ?? "/Convoscope_new.png"}
            fit="cover"
            height="100%"
            sx={{ scale: `${imageScale}` }}
          />
        </Box>
        <Box p={"lg"} h="100%" w="100%" sx={{ flex: "10 1 0" }}>
          {children}
          <Group p="lg" sx={{ bottom: 0, right: 0, position: "absolute" }}>
        <Text
          transform="uppercase"
          fw="bold"
          size={rem(22)}
          sx={{ letterSpacing: rem(1.1) }}
        >
          {agentName}
        </Text>
        <Image
          src={agentIconSrc}
          height={large ? rem(50) : rem(40)}
          width={large ? rem(50) : rem(40)}
          radius="md"
        />
      </Group>
        </Box>
      </Flex>
    </Card>
  );
};

export default CardWrapper;