import {
  Flex,
  Card,
  createStyles,
  rem,
  Box,
  Image,
  Group,
  Text,
  useMantineTheme,
} from "@mantine/core";
import { PropsWithChildren, useRef } from "react";

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
}

const CardWrapper = ({
  selected = false,
  onClick,
  large = false,
  children,
  pointer = false,
  imageSrc = "/Convoscope_new.png",
  agentName,
  agentIconSrc,
}: PropsWithChildren<CardWrapperProps>) => {
  const { classes } = useStyles();
  const theme = useMantineTheme();

  const backgroundRef = useRef<HTMLDivElement>(null);

  return (
    <Card
      radius="md"
      p={0}
      h={large ? "36vh" : "24vh"}
      onClick={onClick}
      className={classes.card}
      sx={{
        ...(selected && { borderColor: theme.colors.convoscopeBlue}),
        ...(pointer && { cursor: "pointer" }),
      }}
    >
      <Flex align={"center"} h={"100%"}>
        <Box
          sx={{
            borderRadius: rem(30),
            flex: `1 1 ${large ? 180 : 120}px`,
            overflow: "clip",
            height: "100%",
            position: "relative",
          }}
          ref={backgroundRef}
        >
          <Box
            sx={{
              position: "absolute",
              width: "100%",
              height: "100%"
            }}
          >
            <img
              src={imageSrc}
              style={{
                objectFit: "cover",
                height: "100%",
                width: "100%",
                filter: "blur(5px) brightness(0.7)"
              }}
            />
          </Box>
          <Box
            sx={{
              position: "absolute",
              width: "100%",
              height: "100%"
            }}
          >
            <img
              src={imageSrc}
              height="100%"
              width="100%"
              style={{
                display: "block",
                objectFit: "contain",
                margin: "auto"
              }}
            />
          </Box>
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