import { debounce } from "lodash";
import { useCallback, useEffect } from "react";
import { useTranscription } from "./useTranscription";
import { useSpeechRecognition } from "react-speech-recognition";

const Transcriber = () => {
  const { submitTranscript } = useTranscription();
  const { transcript } = useSpeechRecognition();

  const debouncedSubmitFinalTranscript = useCallback(
    debounce(() => submitTranscript(true), 800),
    []
  );

  useEffect(() => {
    submitTranscript(false);
    debouncedSubmitFinalTranscript();
  }, [transcript, debouncedSubmitFinalTranscript, submitTranscript]);

  return null;
};

export default Transcriber;
