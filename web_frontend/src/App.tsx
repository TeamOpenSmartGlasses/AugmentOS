import { useEffect, useRef, useState } from "react";
import {
  Container,
  Flex,
  MantineProvider,
  ScrollArea,
  Stack,
  Title,
  createStyles,
} from "@mantine/core";
import Sidebar from "./components/Sidebar";
import TranscriptCard from "./components/TranscriptCard";
import PageView from "./components/PageView";
import { Entity } from "./types";
import ReferenceCard from "./components/ReferenceCard";
import Cookies from "js-cookie";
import axiosClient from "./axiosConfig";
import {
  // useDisclosure,
  useMediaQuery,
} from "@mantine/hooks";

const useStyles = createStyles((theme) => ({
  root: {
    height: "100vh",
    width: "100vw",
    backgroundColor: "#DEDEDE",
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
  const hideTitle = entities.length > 5;

  // const [opened, { open, close }] = useDisclosure(false);
  const smallerThanMedium = useMediaQuery("(max-width: 62em)");

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
      features: ["contextual_search_engine"], //list of features here
      userId: window.userId,
      deviceId: window.deviceId,
    };

    axiosClient
      .post("/api/ui_poll", subTranscript)
      .then((res) => {
        const newEntitiesDict = res.data.result;
        if (res.data.success) console.log(res.data);
        if (res.data.result) {
          const newEntitiesArray = Object.keys(newEntitiesDict).map(function (
            k
          ) {
            return newEntitiesDict[k];
          });
          console.log(newEntitiesArray);
          setEntities((entities) => [...entities, ...newEntitiesArray]);
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

  const openModal = () => {
    // if (!opened && smallerThanMedium) {
    //   // open();
    // }
  };

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
        {!smallerThanMedium && <Sidebar />}
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
              <Title
                order={2}
                sx={{
                  display: hideTitle ? "none" : "block",
                  transition: "display 0.5s, transform 0.5s",
                  transform: hideTitle ? "translateY(-100%)" : "",
                }}
              >
                Contextual Search Engine
              </Title>
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
                    openModal={openModal}
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

      {/* Save this for settings */}
      {/* <MediaQuery largerThan={"md"} styles={{ display: "none" }}>
        <Modal
          size="80vw"
          ml={40}
          opened={opened}
          onClose={close}
          title={<Text fw={700}>More Details</Text>}
        >
          <Box h={"80vh"}>
            <PageView
              viewMoreUrl={viewMoreUrl}
              loading={loadingViewMore}
              setLoading={setLoadingViewMore}
            />
          </Box>
        </Modal>
      </MediaQuery> */}
    </MantineProvider>
  );
}
