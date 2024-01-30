import { Button, ButtonProps, createStyles, rem } from "@mantine/core";
import { PolymorphicComponentProps } from "@mantine/utils";
import { PropsWithChildren } from "react";

const useStyles = createStyles((theme) => ({
  button: {
    borderRadius: rem(50),
    background: theme.colors.buttonGradientBlue,
    color: theme.colors.cardFill,
    transition: "0.2s",
    "&:hover": {
      filter: "brightness(0.9)",
    },
  },
}));

const StyledButton = ({
  children,
  ...props
}: PropsWithChildren<
  ButtonProps & PolymorphicComponentProps<"button", ButtonProps>
>) => {
  const { classes } = useStyles();

  return (
    <Button className={classes.button} {...props}>
      {children}
    </Button>
  );
};

export default StyledButton;
