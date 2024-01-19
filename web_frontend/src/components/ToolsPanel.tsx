import { Stack, rem, useMantineTheme } from "@mantine/core";
import Chat from "./Chat";

const ToolsPanel = () => {
  const theme = useMantineTheme();

  return (
    <Stack
      h="100%"
      sx={{
        gap: 0,
        backgroundColor: theme.colors.cardFill,
        border: `1.5px solid ${theme.colors.cardStroke}`,
        borderRadius: rem(30),
        overflow: "clip",
      }}
    >
      <Chat />
    </Stack>
  );
};

export default ToolsPanel;
