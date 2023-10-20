import { useEffect, useRef, useState } from "react";
import {
  Container,
  Flex,
  MantineProvider,
  ScrollArea,
  Stack,
  createStyles,
} from "@mantine/core";
import Sidebar from "./components/Sidebar";
import PageView from "./components/PageView";
import { Entity } from "./types";
import ReferenceCard from "./components/ReferenceCard";
import Cookies from "js-cookie";
import axiosClient from "./axiosConfig";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import "./index.css";
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
    padding: 0,
    flex: "1 1 0"
  },

    rightPanel: { backgroundColor: theme.white, borderRadius: "0.5rem", margin: "0rem 0rem 1rem 0rem" },
    referenceScroll: { backgroundColor: theme.white, borderRadius: "0.5rem", padding: "1rem", margin: "0rem 0rem 1rem 0rem" },
}));

export default function App() {
  const { classes } = useStyles();

  const endOfReferencesRef = useRef<HTMLDivElement | null>(null);
  // TODO: remove test card
  const [entities, setEntities] = useState<Entity[]>([
    {
      name: "test name",
      summary: "The Doppler effect (also Doppler shift) is the change in the frequency of a wave.",
      image_url:
      // "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Doppler_effect_diagrammatic.svg/520px-Doppler_effect_diagrammatic.svg.png",
        "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Redshift.svg/340px-Redshift.svg.png",
      url: "test url",
      agent_name: "FactChecker",
      agent_insight: "FactChecker",
    },
  ]);
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
    const uiPollRequstBody = {
      features: ["contextual_search_engine", "proactive_agent_insights", "agent_chat"], //list of features here
      userId: window.userId,
      deviceId: window.deviceId,
    };

    axiosClient
      .post(UI_POLL_ENDPOINT, uiPollRequstBody)
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
          console.log(res.data);
          const newEntities = res.data.result as any[];
          const newInsights = res.data.results_proactive_agent_insights as any[];
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
            gap={"0.8rem"}
            h={"100%"}
            direction={smallerThanMedium ? "column" : "row"}
          >
            {/* Left Panel */}
            <Stack
              h={{ xs: "50%", md: "100%" }}
              spacing={"xl"}
            >
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
          </Flex>
        </Container>

        <Container fluid className={classes.container}>
          <PageView
            // TODO: remove testing url
            // viewMoreUrl={viewMoreUrl}
            viewMoreUrl={"https://en.wikipedia.org/wiki/Doppler_effect"}
            loading={loadingViewMore}
            setLoading={setLoadingViewMore}
          />
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
