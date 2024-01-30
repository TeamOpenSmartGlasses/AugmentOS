import { Stack, createStyles } from "@mantine/core";
import Chat from "./Chat";
import { cardStyles } from "../theme";

const useStyles = createStyles({
  card: { ...cardStyles, overflow: "clip" },
});

const ToolsPanel = () => {
  const { classes } = useStyles();

  return (
    <Stack className={classes.card} h="100%">
      <Chat />
    </Stack>
  );
};

export default ToolsPanel;
