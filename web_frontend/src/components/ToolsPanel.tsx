import {
  ActionIcon,
  Box,
  Collapse,
  Stack,
  Tabs,
  rem,
  useMantineTheme,
} from "@mantine/core";
import Chat from "./Chat";
import {
  IconPhoto,
  IconMessageCircle,
  IconSettings,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";

const iconStyle = { width: rem(12), height: rem(12) };

const ToolsPanel = () => {
  const theme = useMantineTheme();
  const [opened, { toggle }] = useDisclosure(false);

  return (
    <Box pos="fixed" bottom="0" right="0" w="50vw">
      <Tabs defaultValue="mira">
        <Stack
          sx={{
            gap: 0,
            backgroundColor: theme.colors.cardFill,
            border: `1.5px solid ${theme.colors.cardStroke}`,
            borderRadius: `${rem(30)} ${rem(30)} 0 0`,
          }}
        >
          <Tabs.List p="xs">
            <Tabs.Tab
              value="mira"
              icon={<IconMessageCircle style={iconStyle} />}
            >
              Mira
            </Tabs.Tab>
            <Tabs.Tab value="tab2" icon={<IconPhoto style={iconStyle} />}>
              Tab 2
            </Tabs.Tab>
            <Tabs.Tab value="tab3" icon={<IconSettings style={iconStyle} />}>
              Tab 3
            </Tabs.Tab>
            <ActionIcon onClick={toggle} ml="auto" my="auto">
              {opened ? <IconChevronDown /> : <IconChevronUp />}
            </ActionIcon>
          </Tabs.List>
          <Collapse in={opened}>
            <Box h="50vh">
              <Tabs.Panel value="mira" h="100%">
                <Chat />
              </Tabs.Panel>

              <Tabs.Panel value="tab2">Tab 2 content</Tabs.Panel>

              <Tabs.Panel value="tab3">Tab 2 content</Tabs.Panel>
            </Box>
          </Collapse>
        </Stack>
      </Tabs>
    </Box>
  );
};

export default ToolsPanel;
