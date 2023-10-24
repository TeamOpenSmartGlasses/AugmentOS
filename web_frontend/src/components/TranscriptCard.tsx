import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActionIcon,
  Text,
  Flex,
  Box,
  ScrollArea,
  createStyles,
} from "@mantine/core";
import {
  IconPlayerStopFilled,
  IconPlayerPlayFilled,
} from "@tabler/icons-react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { debounce } from "lodash";
import axiosClient from "../axiosConfig";
import { CHAT_ENDPOINT } from "../serverEndpoints";

const useStyles = createStyles((theme) => ({
  card: { backgroundColor: theme.white, borderRadius: "0.25rem" },

  iconButton: {
    width: "2rem",
    height: "2rem",
  },

  transcriptBox: {
    backgroundColor: "gray",
    borderBottomLeftRadius: "0.25rem",
    WebkitBorderBottomRightRadius: "0.25rem",
  },
}));

interface TranscriptCardProps {
  transcriptBoxHeight: string;
}

const TranscriptCard = ({ transcriptBoxHeight }: TranscriptCardProps) => {
  const { classes } = useStyles();
  const endOfTranscriptRef = useRef<HTMLDivElement | null>(null);

  const [isRecognizing, setIsRecognizing] = useState(true);
  const [transcriptStartIdx, setTranscriptStartIdx] = useState(0);

  const {
    transcript,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();

  const startRecognizing = () => {
    SpeechRecognition.startListening({ continuous: true });
    setIsRecognizing(true);
  };

  const stopRecognizing = () => {
    SpeechRecognition.stopListening();
    setIsRecognizing(false);
    resetTranscript();
    setTranscriptStartIdx(0);
  };

  const submitTranscript = (
    transcript: string,
    transcriptStartIdx: number,
    isFinal: boolean
  ) => {
    const text = transcript.substring(transcriptStartIdx);

    const payload = {
      text: text,
      userId: window.userId,
      timestamp: Date.now(),
      isFinal,
    };

    if (text === "") {
      return;
    }

    if (isFinal && text !== "") {
      setTranscriptStartIdx(transcript.length + 1);
    }

    //console.log(text, isFinal);

    axiosClient
      .post(CHAT_ENDPOINT, payload)
      // .then((res) => {})
      .catch((error) => {
        console.error(error);
      });
  };

  const debouncedSubmitFinalTranscript = useCallback(
    debounce(
      (transcript, index) => submitTranscript(transcript, index, true),
      800
    ),
    []
  );

  const scrollToBottom = () => {
    endOfTranscriptRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  };

  useEffect(() => {
    startRecognizing();
  }, []);

  useEffect(() => {
    scrollToBottom();
    submitTranscript(transcript, transcriptStartIdx, false);
    debouncedSubmitFinalTranscript(transcript, transcriptStartIdx);
  }, [transcript]);

  // useEffect(() => {
  //   console.log("Final transcript", finalTranscript);
  // }, [finalTranscript]);

  // useEffect(() => {
  //   console.log("Listenitng", listening);
  // }, [listening]);

  // useEffect(() => {
  //   console.log(transcriptStartIdx);
  // }, [transcriptStartIdx]);

  if (!browserSupportsSpeechRecognition) {
    return null;
  }

  return (
      <Flex justify={"space-between"} align={"center"} px={"md"} py={"xs"}>
        <Text size={"lg"} weight={500}>
          {isMicrophoneAvailable
            ? isRecognizing
              ? "Recognizing Speech"
              : "Start Transcription"
            : "Please enable microphone"}
        </Text>
        {isRecognizing ? (
          <ActionIcon
            variant="light"
            onClick={stopRecognizing}
            color={"red"}
            className={classes.iconButton}
            disabled={
              !isMicrophoneAvailable || !browserSupportsSpeechRecognition
            }
          >
            <IconPlayerStopFilled size="1.25rem" />
          </ActionIcon>
        ) : (
          <ActionIcon
            variant="light"
            onClick={startRecognizing}
            color={"green"}
            className={classes.iconButton}
            disabled={
              !isMicrophoneAvailable || !browserSupportsSpeechRecognition
            }
          >
            <IconPlayerPlayFilled size="1.25rem" />
          </ActionIcon>
        )}
      {/*isRecognizing && (
        <ScrollArea
          scrollHideDelay={100}
          className={classes.transcriptBox}
          px={"lg"}
          py={"md"}
        >
          <Box mah={transcriptBoxHeight}>
            <Text size={"xl"} color="white">
              {transcript}
            </Text>
            <div ref={endOfTranscriptRef}></div>
          </Box>
        </ScrollArea>
      )*/}
    </Flex>
  );
};

export default TranscriptCard;
