import { Flex, createStyles, Box, Image } from "@mantine/core";
import { GAP_VH } from "../components/CardWrapper";
import SettingsModal from "../components/SettingsModal";
import Sidebar from "../components/Sidebar";
import { useRecoilValue } from "recoil";
import { entitiesState, isExplicitListeningState } from "../recoil";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { setUserIdAndDeviceId } from "../utils/utils";
import CardScrollArea from "../components/CardScrollArea";
import ToolsPanel from "../components/ToolsPanel";

const useStyles = createStyles({
  root: {
    height: "100vh",
    width: "100vw",
    background:
      "var(--bg-gradient-full---blue, linear-gradient(180deg, #191A27 2.23%, #14141D 25.74%, #14141D 49.42%, #14141D 73.62%, #14141D 96.28%))",
    overflow: "clip",
  },

  container: {
    padding: 0,
  },
});

const MainLayout = () => {
  const { classes } = useStyles();

  const entities = useRecoilValue(entitiesState);
  const isExplicitListening = useRecoilValue(isExplicitListeningState);

  const [opened, { open: openSettings, close: closeSettings }] =
    useDisclosure(false);
  const smallerThanMedium = useMediaQuery("(max-width: 62em)");

  const toggleSettings = () => {
    if (opened) {
      closeSettings();
    } else {
      openSettings();
    }
  };

  return (
    <>
      <Flex className={classes.root}>
        <Sidebar settingsOpened={opened} toggleSettings={toggleSettings} />
        <Box
          className={classes.container}
          sx={{ flex: "7 1 0" }}
          pt={`${GAP_VH}vh`}
          px={"1rem"}
        >
          {entities.length === 0 && !isExplicitListening && (
            <Box w="50%" mx="auto" mt="xl">
              <Image src={"/blobs.gif"} fit="cover" />
            </Box>
          )}
          <CardScrollArea />
        </Box>

        <Box py={`${GAP_VH}vh`} pl="1rem" pr="2rem" sx={{ flex: "3 1 0" }}>
          <ToolsPanel />
        </Box>
      </Flex>

      <SettingsModal
        smallerThanMedium={smallerThanMedium}
        opened={opened}
        closeSettings={closeSettings}
        setUserIdAndDeviceId={setUserIdAndDeviceId}
      />
    </>
  );
};

export default MainLayout;
