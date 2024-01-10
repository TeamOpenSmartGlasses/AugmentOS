import {
  Flex,
  Container,
  ContainerProps,
  FlexProps,
  createPolymorphicComponent,
  createStyles,
  Box,
  Image,
  Stack,
  Button,
  Group,
} from "@mantine/core";
import { motion } from "framer-motion";
import { GAP_VH } from "../components/CardWrapper";
//import ExplorePane from "../components/ExplorePane";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import axiosClient from "../axiosConfig";
import {
  entitiesState,
  googleSearchResultUrlAtom,
  isExplicitListeningState,
  studyConditionAtom,
  videoTimeAtom,
} from "../recoil";
import { useEffect, useRef, useState } from "react";
import CardScrollArea from "../components/CardScrollArea";
import { VIDEO_SRC } from "../constants";
import { LOAD_RECORDING_ENDPOINT } from "../serverEndpoints";
import { StudyCondition } from "../types";

// animate-able components for framer-motion
// https://github.com/orgs/mantinedev/discussions/1169#discussioncomment-5444975
const PFlex = createPolymorphicComponent<"div", FlexProps>(Flex);
const PContainer = createPolymorphicComponent<"div", ContainerProps>(Container);

const useStyles = createStyles({
  root: {
    height: "100vh",
    width: "100vw",
    background:
      "var(--bg-gradient-full---blue, linear-gradient(180deg, #191A27 2.23%, #14141D 25.74%, #14141D 49.42%, #14141D 73.62%, #14141D 96.28%))",
    overflow: "clip",
  },

  container: {
    width: "100%",
    height: "100%",
    padding: 0,
    flex: "1 1 0",
  },
});

// Get the recording from the backend and store the prerecorded entities in `results`
let results: any[] = [];

const getRecordingFromPublicFolder = async (videoId: string) => {
  console.log(`Fetching this: /${videoId}.json`);
  try {
    const response = await fetch(`/${videoId}.json`);
    const jsonData = await response.json();
    console.error("got that stuff in getRecordingFromPublicFolder()");
    results = jsonData;
    return true; // Return true if fetch is successful
  } catch (error) {
    console.error("Error fetching the JSON file:", error);
    return false; // Return false in case of an error
  }
};

const getRecordingFromBackend = (videoId: string) => {
  if (!videoId) return;

  const payload = {
    recordingName: videoId,
  };

  axiosClient
    .post(LOAD_RECORDING_ENDPOINT, payload)
    .then((res: any) => {
      results = res.data;
    })
    .catch(function (error: any) {
      console.error(error);
    });
};

const videoName = VIDEO_SRC.substring(0, VIDEO_SRC.indexOf("."));
console.log(videoName);
getRecordingFromPublicFolder(videoName).then((success) => {
  if (!success) {
    getRecordingFromBackend(videoName);
  }
});

let resultDisplayIndex = 0;
const StudyLayout = () => {
  const { classes } = useStyles();

  const entities = useRecoilValue(entitiesState);
  const setEntities = useSetRecoilState(entitiesState);
  const isExplicitListening = useRecoilValue(isExplicitListeningState);
  const [time, setTime] = useRecoilState(videoTimeAtom);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (results.length == 0) return;
    if (resultDisplayIndex >= results.length) return;

    if (
      time !== undefined &&
      time > results[resultDisplayIndex]["time_since_recording_start"]
    ) {
      setEntities((entities: any) =>
        [...entities, results[resultDisplayIndex]].filter((e) => {
          return !(e == null || e == undefined);
        })
      );
      resultDisplayIndex += 1;
    }
    return () => {};
  }, [time]);

  const [hasVideoEnded, setHasVideoEnded] = useState(false);
  const studyCondition = useRecoilValue(studyConditionAtom);
  const setGoogleSearchResultUrl = useSetRecoilState(googleSearchResultUrlAtom);

  /*
  useEffect(() => {
        const timer = setTimeout(() => {
            // Your function logic here
            videoRef.current?.play();
        }, 5 * 1000); // n is the delay in milliseconds (1000 ms = 1 second)

        return () => clearTimeout(timer); // Cleanup timer
    }, []); // Empty dependency array means this runs once after the initial render
   */


  useEffect(() => {
    if (studyCondition === StudyCondition.GOOGLE) {
      // insert the Programmable Search Engine script into the DOM
      const script = document.createElement("script");
      document.head.append(script);
      //script.src = "https://cse.google.com/cse.js?cx=c6140097ef66f4f84";
      script.src = "https://cse.google.com/cse.js?cx=5670fc00c6f414e7a";

      const resultsRenderedCallback = () => {
        // get all the search results
        document.querySelectorAll("a.gs-title, a.gs-image").forEach((element) =>
          element.addEventListener("click", (event) => {
            // don't open the link; instead, display it in the explore pane
            event.preventDefault();
            setGoogleSearchResultUrl(
              element.getAttribute("data-ctorig") ?? undefined
            );
          })
        );
      };

      // Use the Programmable Search Engine API to run the callback whenever results render
      // https://developers.google.com/custom-search/docs/element
      const windowUnsafeTyped = window as unknown as {
        __gcse: { searchCallbacks?: unknown };
      };
      windowUnsafeTyped.__gcse || (windowUnsafeTyped.__gcse = {});
      windowUnsafeTyped.__gcse.searchCallbacks = {
        web: {
          rendered: resultsRenderedCallback,
        },
      };
    }
  }, [setGoogleSearchResultUrl, studyCondition]);

  return (
    <>
      <PFlex component={motion.div} className={classes.root} layout>
        <PContainer
          component={motion.div}
          layout
          fluid
          w={"75%"}
          justify-content={"center"}
          sx={{
            flex: "none",
          }}
          className={classes.container}
        >
          <Stack
            sx={{
              height: "100%",
              width: "100%",
              alignItems: "center",
              justifyContent: "center",
              padding: "15px",
            }}
          >
            <Stack justify-content="center" align="center">
              <Group>
                <Button
                  onClick={() => videoRef.current?.play()}
                  variant="default"
                  fullWidth
                  disabled={hasVideoEnded}
                >
                  {hasVideoEnded
                    ? "Video ended"
                    : time === undefined
                    ? "Start"
                    : `Please watch until end of video.`}
                </Button>
              </Group>
              <video
                src={VIDEO_SRC}
                style={{ width: "73vw", height: "auto" }} // Adjust the value as needed
                ref={videoRef}
                onTimeUpdate={() => setTime(videoRef.current?.currentTime)}
                onEnded={() => setHasVideoEnded(true)}
              ></video>
            </Stack>
            {/*(studyCondition === StudyCondition.GOOGLE) && (
              <ExplorePane
                loading={loadingViewMore}
                setLoading={setLoadingViewMore}
              />
            )*/}
          </Stack>
        </PContainer>
        <PContainer
          component={motion.div}
          layout
          fluid
          className={classes.container}
          w={"25%"}
          pt={studyCondition !== StudyCondition.GOOGLE ? `${GAP_VH}vh` : "0"}
          px={"1rem"}
          transition={{ bounce: 0 }}
        >
          {/* Left Panel */}
          {studyCondition === StudyCondition.CONVOSCOPE && (
            <>
              {entities.length === 0 && !isExplicitListening && (
                <Box w="25%" mx="auto" mt="xl">
                  <Image src={"/blobs.gif"} fit="cover" />
                </Box>
              )}
              <CardScrollArea />
            </>
          )}
          {studyCondition === StudyCondition.GOOGLE && (
            <Box
              sx={{
                ".gsc-input": { color: "black" },
                ".gsc-control-cse": { height: "100%" },
                ".gsc-control-wrapper-cse": {
                  height: "100%",
                  overflow: "auto",
                },
                "#___gcse_1": { height: "100%" },
                height: "100%",
              }}
            >
              <div className="gcse-searchbox"></div>
              <div className="gcse-searchresults"></div>
            </Box>
          )}
        </PContainer>


      </PFlex>
    </>
  );
};

export default StudyLayout;
