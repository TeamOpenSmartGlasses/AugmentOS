import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActionIcon,
  createStyles,
  keyframes,
  Image,
  rem,
} from "@mantine/core";
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
    animation: `${breathe} 6s ease-in-out infinite`
  },
}));

const breathe = keyframes`
  0% { transform: translate(0); filter: brightness(1); }
  50% { transform: translate(0, -6px); filter: brightness(1.2); }
  100% { transform: translate(0); filter: brightness(1); }
`;

const TranscriptButton = () => {
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
    <ActionIcon
      variant="filled"
      radius={100}
      onClick={isRecognizing ? stopRecognizing : startRecognizing}
      size={rem(80)}
      className={classes.iconButton}
      disabled={!isMicrophoneAvailable || !browserSupportsSpeechRecognition}
    >
      {isRecognizing ? (
        <Image src="/record_button.svg" />
      ) : (
        <Image src="/record_button_start.svg" />
      )}
    </ActionIcon>
  );
};

export default TranscriptButton;
