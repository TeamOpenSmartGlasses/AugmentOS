import { ActionIcon, createStyles, keyframes, Image, rem } from "@mantine/core";
import { useSpeechRecognition } from "react-speech-recognition";
import { useRecoilState } from "recoil";
import { isRecognizingState } from "../recoil";

const breathe = keyframes`
  0% { transform: translate(0); filter: brightness(1); }
  50% { transform: translate(0, -6px); filter: brightness(1.2); }
  100% { transform: translate(0); filter: brightness(1); }
`;

const useStyles = createStyles({
  iconButton: {
    width: "2rem",
    height: "2rem",
    animation: `${breathe} 6s ease-in-out infinite`,
  },
});

const TranscriptButton = () => {
  const { classes } = useStyles();

  const { browserSupportsSpeechRecognition, isMicrophoneAvailable } =
    useSpeechRecognition();

  const [isRecognizing, setIsRecognizing] = useRecoilState(isRecognizingState);

  return (
    <ActionIcon
      variant="filled"
      radius={100}
      onClick={() => setIsRecognizing((prevVal) => !prevVal)}
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
