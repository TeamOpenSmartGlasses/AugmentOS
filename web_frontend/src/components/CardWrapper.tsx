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
import { cardStyles } from "../theme";

const useStyles = createStyles(() => ({
  card: {
    marginTop: `${GAP_VH}vh`,
    ":first-of-type": { marginTop: 0 },
    marginBottom: `${GAP_VH}vh`,
    ":hover": {
      filter: "brightness(1.2)",
    },
    ...cardStyles,
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

export const LARGE_CARD_VH = 36;
export const SMALL_CARD_VH = 24;
export const GAP_VH = (100 - LARGE_CARD_VH - 2 * SMALL_CARD_VH) / 4;

const CardWrapper = ({
  selected = false,
  onClick,
  large = false,
  children,
  pointer = false,
  imageSrc,
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
      h={large ? `${LARGE_CARD_VH}vh` : `${SMALL_CARD_VH}vh`}
      onClick={onClick}
      className={classes.card}
      sx={{
        ...(selected && { borderColor: theme.colors.convoscopeBlue }),
        ...(pointer && { cursor: "pointer" }),
      }}
    >
      <Flex align={"center"} h={"100%"} sx={{ fontSize: "3vh" }}>
        {imageSrc && (
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
                height: "100%",
              }}
            >
              <img
                src={imageSrc}
                style={{
                  objectFit: "cover",
                  height: "100%",
                  width: "100%",
                  filter: "blur(5px) brightness(0.7)",
                }}
              />
            </Box>
            <Box
              sx={{
                position: "absolute",
                width: "100%",
                height: "100%",
              }}
            >
              <img
                src={imageSrc}
                height="100%"
                width="100%"
                style={{
                  display: "block",
                  objectFit: "contain",
                  margin: "auto",
                }}
              />
            </Box>
          </Box>
        )}
        <Box p={"lg"} h="100%" w="100%" sx={{ flex: "10 1 0" }}>
          {children}
          <Group p="lg" sx={{ bottom: 0, right: 0, position: "absolute" }}>
            <Text
              transform="uppercase"
              fw="bold"
              size={"2vh"}
              sx={{ letterSpacing: "0.1vh" }}
            >
              {agentName}
            </Text>
            <Image
              src={agentIconSrc}
              height={large ? "5vh" : "4vh"}
              width={large ? "5vh" : "4vh"}
              radius="md"
            />
          </Group>
        </Box>
      </Flex>
    </Card>
  );
};

export default CardWrapper;
