import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import axiosClient from "../axiosConfig";
import { CHAT_ENDPOINT } from "../serverEndpoints";
import { useRecoilState, useRecoilValue } from "recoil";
import { isRecognizingState, transcriptStartIdxState } from "../recoil";
import { debounce } from "lodash";
import { useCallback, useEffect } from "react";

export const useTranscription = () => {
  const isRecognizing = useRecoilValue(isRecognizingState);
  const [transcriptStartIdx, setTranscriptStartIdx] = useRecoilState(
    transcriptStartIdxState
  );

  const { transcript, resetTranscript } = useSpeechRecognition();

  useEffect(() => {
    if (isRecognizing) {
      SpeechRecognition.startListening({ continuous: true });
    } else {
      SpeechRecognition.stopListening();
      resetTranscript();
      setTranscriptStartIdx(0);
    }
  }, [isRecognizing, resetTranscript, setTranscriptStartIdx]);

  const submitTranscript = useCallback(
    (isFinal: boolean) => {
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
    },
    [setTranscriptStartIdx, transcript, transcriptStartIdx]
  );

  const debouncedSubmitFinalTranscript = useCallback(
    debounce(() => submitTranscript(true), 800),
    []
  );

  useEffect(() => {
    submitTranscript(false);
    debouncedSubmitFinalTranscript();
  }, [debouncedSubmitFinalTranscript, submitTranscript, transcript]);
};
