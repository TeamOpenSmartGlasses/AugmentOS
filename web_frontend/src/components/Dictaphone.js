import React, { useEffect, useRef } from "react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";

const Dictaphone = (props) => {
  const { onTranscriptChanged } = props;
  const endOfTranscript = useRef(null);

  const {
    transcript,
    browserSupportsSpeechRecognition,
    browserSupportsContinuousListening,
  } = useSpeechRecognition({});

  useEffect(() => {
    onTranscriptChanged(transcript); //send transcript to parent
    endOfTranscript.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  }, [transcript]);

  if (!browserSupportsSpeechRecognition) {
    return null;
  }

  if (browserSupportsContinuousListening) {
    SpeechRecognition.startListening({ continuous: true });
  } else {
    // Fallback behaviour
  }

  return (
    <div className="scrollcontent">
      <p className="transcript-text">{transcript}</p>
      <div ref={endOfTranscript}></div>
    </div>
  );
};

export default Dictaphone;
