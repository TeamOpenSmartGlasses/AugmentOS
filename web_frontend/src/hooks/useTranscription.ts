import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import axiosClient from "../axiosConfig";
import { CHAT_ENDPOINT } from "../serverEndpoints";
import { useRecoilState, useSetRecoilState } from "recoil";
import { isRecognizingState, transcriptStartIdxState } from "../recoil";

export const useTranscription = () => {
  const setIsRecognizing = useSetRecoilState(isRecognizingState);
  const [transcriptStartIdx, setTranscriptStartIdx] = useRecoilState(
    transcriptStartIdxState
  );

  const { transcript, resetTranscript } = useSpeechRecognition();

  const stopRecognizing = () => {
    SpeechRecognition.stopListening();
    setIsRecognizing(false);
    resetTranscript();
    setTranscriptStartIdx(0);
  };

  const startRecognizing = () => {
    SpeechRecognition.startListening({ continuous: true });
    setIsRecognizing(true);
  };

  const submitTranscript = (isFinal: boolean) => {
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

  return { stopRecognizing, startRecognizing, submitTranscript };
};
