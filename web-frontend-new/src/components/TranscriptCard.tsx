import { useEffect, useRef, useState } from "react";
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
import "regenerator-runtime/runtime";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { debounce } from "lodash";
import axios from "axios";

const useStyles = createStyles((theme) => ({
  card: { backgroundColor: theme.white, borderRadius: "0.25rem" },

  iconButton: {
    width: "2rem",
    height: "2rem",
  },
}));

const TranscriptCard = () => {
  const { classes } = useStyles();
  const endOfTranscriptRef = useRef<HTMLDivElement | null>(null);

  const [isRecognizing, setIsRecognizing] = useState(true);
  const [transcriptStartIdx, setTranscriptStartIdx] = useState(0);

  const {
    transcript,
    resetTranscript,
    // listening,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition({});

  const startRecognizing = () => {
    SpeechRecognition.startListening({ continuous: true });
    setIsRecognizing(true);
  };

  const stopRecognizing = () => {
    SpeechRecognition.stopListening();
    setIsRecognizing(false);
    resetTranscript();
  };

  const submitTranscript = (
    transcript: string,
    transcriptStartIdx: number,
    isFinal: boolean
  ) => {
    const text = transcript.substring(transcriptStartIdx);

    const payload = {
      text: text,
      userId: "test",
      timestamp: Date.now(),
      isFinal,
    };

    if (text === "") {
      return;
    }

    if (isFinal && text !== "") {
      setTranscriptStartIdx(transcript.length + 1);
    }

    console.log(text, isFinal);

    axios
      .post("/api/chat", payload)
      // .then((res) => {})
      .catch((error) => {
        console.error(error);
      });
  };

  const debouncedSubmitFinalTranscript = debounce(
    () => submitTranscript(transcript, transcriptStartIdx, true),
    800
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
    if (isRecognizing) {
      submitTranscript(transcript, transcriptStartIdx, false);
      debouncedSubmitFinalTranscript();
    }
  }, [transcript]);

  useEffect(() => {
    console.log(transcriptStartIdx);
  }, [transcriptStartIdx]);

  if (!browserSupportsSpeechRecognition) {
    return null;
  }

  return (
    <Flex direction={"column"} py={"xs"} px={"md"} className={classes.card}>
      <Flex justify={"space-between"} align={"center"}>
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
      </Flex>
      {isRecognizing && (
        <ScrollArea scrollHideDelay={100}>
          <Box mt={5} mah={"9vh"}>
            <Text size={"lg"}>{transcript}</Text>
            <div ref={endOfTranscriptRef}></div>
          </Box>
        </ScrollArea>
      )}
    </Flex>
  );
};

export default TranscriptCard;
