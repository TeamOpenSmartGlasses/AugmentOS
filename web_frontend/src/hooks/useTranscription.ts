import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import axiosClient from "../axiosConfig";
import { CHAT_ENDPOINT } from "../serverEndpoints";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { isExplicitListeningState, isRecognizingState } from "../recoil";
import { debounce } from "lodash";
import { useCallback, useEffect, useState, useRef } from "react";

// Define the debounced function outside the component
const debouncedSubmit = debounce((submitFunc, transcriptRef) => {
  submitFunc(true, transcriptRef.current);
}, 800);

/**
 * Submits the transcript to the backend as the transcript changes
 * when the app is recognizing speech.
 */
export const useTranscription = () => {
  const isRecognizing = useRecoilValue(isRecognizingState);
  const setIsExplicitListening = useSetRecoilState(isExplicitListeningState);

  const [transcriptStartIdx, setTranscriptStartIdx] = useState(0);

  const { transcript, resetTranscript } = useSpeechRecognition();

  useEffect(() => {
    if (isRecognizing) {
      SpeechRecognition.startListening({ continuous: true });
    } else {
      SpeechRecognition.stopListening();
      resetTranscript();
      setTranscriptStartIdx(0);
      setIsExplicitListening(false); // stop showing the explicit card
    }
  }, [
    isRecognizing,
    resetTranscript,
    setIsExplicitListening,
    setTranscriptStartIdx,
  ]);

  //ref to handle the transcript
  const transcriptRef = useRef(transcript);

  useEffect(() => {
    // Update the ref whenever transcript changes
    transcriptRef.current = transcript;
  }, [transcript]);

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

  useEffect(() => {
    submitTranscript(false);

    // Call the debounced function with the ref
    debouncedSubmit(submitTranscript, transcriptRef);
  }, [transcript]);

};
