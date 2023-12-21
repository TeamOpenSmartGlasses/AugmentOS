import { useEffect } from "react";
import "./index.css";
import { useTranscription } from "./hooks/useTranscription";
import { useUiUpdateBackendPoll } from "./hooks/useUiUpdateBackendPoll";
import { generateRandomUserId, setUserIdAndDeviceId } from "./utils/utils";
import Cookies from "js-cookie";
import StudyLayout from "./layouts/StudyLayout";
import { useTrackTabChange } from "./hooks/useTrackTabChange";

export default function App() {
  useTranscription();
  useUiUpdateBackendPoll();
  useTrackTabChange();

  useEffect(() => {
    let userId = Cookies.get("userId");
    if (userId == undefined || userId == null || userId == "") {
      console.log("No userID detected - generating random userID");
      userId = generateRandomUserId();
    } else {
      console.log("Previous userId found: " + userId);
    }
    setUserIdAndDeviceId(userId);
  }, []);

  return <StudyLayout />;
}
