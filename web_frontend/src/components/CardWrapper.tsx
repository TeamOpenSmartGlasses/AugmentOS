import {
  Flex,
  Card,
  createStyles,
  rem,
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
}

const CardWrapper = ({
  selected = false,
  onClick,
  large = false,
  children,
}: PropsWithChildren<CardWrapperProps>) => {
  const { classes } = useStyles();

  return (
    <Card
      radius="md"
      p={0}
      h={large ? "36vh" : "24vh"}
      onClick={onClick}
      className={classes.card}
      sx={{ ...(selected && { filter: "brightness(1.2)" }) }}
    >
      <Flex align={"center"} h={"100%"}>{children}</Flex>
    </Card>
  );
};

export default CardWrapper;