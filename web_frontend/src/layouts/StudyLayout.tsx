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
import ExplorePane from "../components/ExplorePane";
import { useRecoilState, useRecoilValue } from "recoil";
import {
  entitiesState,
  isExplicitListeningState,
  studyConditionAtom,
  videoTimeAtom,
} from "../recoil";
import { useEffect, useRef, useState } from "react";
import CardScrollArea from "../components/CardScrollArea";
import { VIDEO_SRC } from "../constants";
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

const StudyLayout = () => {
  const { classes } = useStyles();

  const entities = useRecoilValue(entitiesState);
  const isExplicitListening = useRecoilValue(isExplicitListeningState);
  const [loadingViewMore, setLoadingViewMore] = useState(false);
  const [time, setTime] = useRecoilState(videoTimeAtom);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideoEnded, setHasVideoEnded] = useState(false);
  const studyCondition = useRecoilValue(studyConditionAtom);

  useEffect(() => {
    if (studyCondition === StudyCondition.GOOGLE) {
      const script = document.createElement("script");
      document.head.append(script);
      script.src = "https://cse.google.com/cse.js?cx=c6140097ef66f4f84";
    }
  }, [studyCondition]);

  return (
    <>
      <PFlex component={motion.div} className={classes.root} layout>
        <PContainer
          component={motion.div}
          layout
          fluid
          className={classes.container}
          w={"50%"}
          pt={`${GAP_VH}vh`}
          px={"1rem"}
          transition={{ bounce: 0 }}
        >
          {/* Left Panel */}
          {studyCondition === StudyCondition.CONVOSCOPE && (
            <>
              {entities.length === 0 && !isExplicitListening && (
                <Box w="50%" mx="auto" mt="xl">
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

        <PContainer
          component={motion.div}
          layout
          sx={{
            flex: "1 1 0",
          }}
          className={classes.container}
        >
          <Stack sx={{ height: "100%", width: "100%" }}>
            <video
              src={VIDEO_SRC}
              width="100%"
              ref={videoRef}
              onTimeUpdate={() => setTime(videoRef.current?.currentTime)}
              onEnded={() => setHasVideoEnded(true)}
            ></video>
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
                  : `current time: ${time} seconds`}
              </Button>
            </Group>
            {studyCondition === StudyCondition.CONVOSCOPE && (
              <ExplorePane
                loading={loadingViewMore}
                setLoading={setLoadingViewMore}
              />
            )}
          </Stack>
        </PContainer>
      </PFlex>
    </>
  );
};

export default StudyLayout;
