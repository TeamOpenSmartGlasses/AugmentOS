import { useEffect, useRef, useState } from "react";
import {
  Container,
  Flex,
  Group,
  MantineProvider,
  ScrollArea,
  Stack,
  Title,
  createStyles,
} from "@mantine/core";
import Sidebar, { NavbarLink } from "./components/Sidebar";
import TranscriptCard from "./components/TranscriptCard";
import PageView from "./components/PageView";
import { Entity } from "./types";
import ReferenceCard from "./components/ReferenceCard";
import Cookies from "js-cookie";
import axiosClient from "./axiosConfig";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import "./index.css";
import { IconSettings } from "@tabler/icons-react";
import SettingsModal from "./components/SettingsModal";
import { UI_POLL_ENDPOINT } from "./serverEndpoints";

const useStyles = createStyles((theme) => ({
  root: {
    height: "100vh",
    width: "100vw",
    backgroundColor: "#DEDEDE",
    overflow: "clip",
  },

  container: {
    width: "100%",
    height: "100%",
    padding: "2.5rem",
  },

  rightPanel: { backgroundColor: theme.white, borderRadius: "0.25rem" },
}));

export default function App() {
  const { classes } = useStyles();

  const endOfReferencesRef = useRef<HTMLDivElement | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [viewMoreUrl, setViewMoreUrl] = useState<string | undefined>();
  const [selectedCardId, setSelectedCardId] = useState<string>("");
  const [loadingViewMore, setLoadingViewMore] = useState(false);

  const [opened, { open: openSettings, close: closeSettings }] =
    useDisclosure(false);
  const smallerThanMedium = useMediaQuery("(max-width: 62em)");
  const hideTitle = !smallerThanMedium && entities.length > 5;

  const toggleSettings = () => {
    if (opened) {
      closeSettings();
    } else {
      openSettings();
    }
  };

  const initUserId = () => {
    let userId = Cookies.get("userId");
    if (userId == undefined || userId == null || userId == "") {
      console.log("No userID detected - generating random userID");
      userId = generateRandomUserId();
    } else {
      console.log("Previous userId found: " + userId);
    }
    setUserIdAndDeviceId(userId);
  };

  const generateRandomUserId = () => {
    const rand = "x"
      .repeat(5)
      .replace(
        /./g,
        () =>
          "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[
            Math.floor(Math.random() * 62)
          ]
      );
    return "WebFrontend_" + rand;
  };

  const setUserIdAndDeviceId = (newUserId: string) => {
    window.userId = newUserId;
    Cookies.set("userId", newUserId, { expires: 9999 });
    window.deviceId = "CSEWebFrontendDefault";
  };

  //poll the backend for UI updates
  const updateUiBackendPoll = () => {
    const subTranscript = {
      features: ["contextual_search_engine", "agent_insights"], //list of features here
      userId: window.userId,
      deviceId: window.deviceId,
    };

    axiosClient
      .post(UI_POLL_ENDPOINT, subTranscript)
      .then((res) => {
        // const newEntitiesDict = res.data.result;
        // if (res.data.success) console.log(res.data);
        // if (
        //   res.data.result && (res.data.result_agent_insights as any[]).length > 0
        // ) {
        //   const newEntitiesArray = Object.keys(newEntitiesDict).map(function (
        //     k
        //   ) {
        //     return newEntitiesDict[k];
        //   });
        //   console.log(newEntitiesArray);
        //   setEntities((entities) => [...entities, ...newEntitiesArray]);
        // }
        // if (
        //   res.data.result_agent_insights &&
        //   (res.data.result_agent_insights as any[]).length > 0
        // ) {
        //   console.log("Insights:", res.data.result_agent_insights);
        // }
        if (res.data.success) {
          const newEntities = res.data.result as any[];
          const newInsights = res.data.result_agent_insights as any[];
          if (newEntities.length === 0 && newInsights.length === 0) return;

          setEntities((entities) => [
            ...entities,
            ...newEntities,
            ...newInsights,
          ]);
        }
      })
      .catch(function (error) {
        console.error(error);
      });
  };

  useEffect(() => {
    initUserId();
    setInterval(() => {
      updateUiBackendPoll();
    }, 1000);
  }, []);

  useEffect(() => {
    endOfReferencesRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  }, [entities]);

  return (
    <MantineProvider
      withGlobalStyles
      withNormalizeCSS
      theme={{
        fontFamily: "Inter, sans-serif",
        fontFamilyMonospace: "Inter, monospace",
        headings: { fontFamily: "Inter, sans-serif" },
      }}
    >
      <Flex className={classes.root}>
        {!smallerThanMedium && (
          <Sidebar settingsOpened={opened} toggleSettings={toggleSettings} />
        )}
        <Container fluid className={classes.container}>
          <Flex
            justify={"space-evenly"}
            gap={"2.5rem"}
            h={"100%"}
            direction={smallerThanMedium ? "column" : "row"}
          >
            {/* Left Panel */}
            <Stack
              w={{ xs: "100%", md: "50%" }}
              h={{ xs: "50%", md: "100%" }}
              spacing={"xl"}
            >
              <Group position="apart">
                <Title
                  order={2}
                  sx={{
                    display: hideTitle ? "none" : "block",
                    transition: "display 0.5s, transform 0.5s",
                    transform: hideTitle ? "translateY(-100%)" : "",
                  }}
                >
                  Convoscope
                </Title>
                {smallerThanMedium && (
                  <NavbarLink
                    active={opened}
                    onClick={toggleSettings}
                    icon={IconSettings}
                    label={"Settings"}
                  />
                )}
              </Group>
              <TranscriptCard
                transcriptBoxHeight={smallerThanMedium ? "2.5vh" : "6.5vh"}
              />
              <ScrollArea scrollHideDelay={100}>
                {entities.map((entity, i) => (
                  <ReferenceCard
                    entity={entity}
                    key={`entity-${i}`}
                    cardId={`entity-${i}`}
                    selectedCardId={selectedCardId}
                    setSelectedCardId={setSelectedCardId}
                    setViewMoreUrl={setViewMoreUrl}
                    setLoading={setLoadingViewMore}
                  />
                ))}
                <div ref={endOfReferencesRef}></div>
              </ScrollArea>
            </Stack>

            {/* Right Panel */}
            <Flex
              direction={"column"}
              w={{ xs: "100%", md: "50%" }}
              h={{ xs: "50%", md: "100%" }}
              px={"md"}
              py={"sm"}
              className={classes.rightPanel}
            >
              <PageView
                viewMoreUrl={viewMoreUrl}
                loading={loadingViewMore}
                setLoading={setLoadingViewMore}
              />
            </Flex>
          </Flex>
        </Container>
      </Flex>

      <SettingsModal
        smallerThanMedium={smallerThanMedium}
        opened={opened}
        closeSettings={closeSettings}
        setUserIdAndDeviceId={setUserIdAndDeviceId}
      />
    </MantineProvider>
  );
}
