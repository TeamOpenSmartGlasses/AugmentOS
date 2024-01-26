import { Box, createStyles } from "@mantine/core";
import { PropsWithChildren } from "react";

const useStyles = createStyles({
  root: {
    height: "100vh",
    width: "100vw",
    background:
      "var(--bg-gradient-full---blue, linear-gradient(180deg, #191A27 2.23%, #14141D 25.74%, #14141D 49.42%, #14141D 73.62%, #14141D 96.28%))",
    overflow: "clip",
  },
});

const RootLayout = ({ children }: PropsWithChildren) => {
  const { classes } = useStyles();

  return <Box className={classes.root}>{children}</Box>;
};

export default RootLayout;
