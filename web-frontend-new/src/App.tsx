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
import TranscriptCard from "./components/TranscriptCard";
import PageView from "./components/PageView";
import axios from "axios";
import { Entity } from "./types";
import ReferenceCard from "./components/ReferenceCard";
import { mockEntities } from "./mockData";

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

  //poll the backend for UI updates
  const updateUiBackendPoll = () => {
    const subTranscript = {
      features: ["contextual_search_engine"], //list of features here
      userId: "cayden",
      deviceId: "cayden-lappy",
    };

    axios
      .post("/api/ui_poll", subTranscript)
      .then((res) => {
        const newEntitiesDict = res.data.result;
        console.log(res.data);
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
    <MantineProvider withGlobalStyles withNormalizeCSS>
      <Flex className={classes.root}>
        <Sidebar />
        <Container fluid className={classes.container}>
          <Flex justify={"space-evenly"} gap={"2.5rem"} h={"100%"}>
            {/* Left Panel */}
            <Stack w={"50%"} spacing={"xl"}>
              <TranscriptCard />
              <ScrollArea scrollHideDelay={100}>
                {entities.map((entity, i) => (
                  <ReferenceCard
                    entity={entity}
                    key={`entity-${i}`}
                    setViewMoreUrl={setViewMoreUrl}
                  />
                ))}
                <div ref={endOfReferencesRef}></div>
              </ScrollArea>
            </Stack>

            {/* Right Panel */}
            <Flex
              direction={"column"}
              w={"50%"}
              px={"md"}
              py={"sm"}
              className={classes.rightPanel}
            >
              <PageView viewMoreUrl={viewMoreUrl} />
            </Flex>
          </Flex>
        </Container>
      </Flex>
    </MantineProvider>
  );
}
