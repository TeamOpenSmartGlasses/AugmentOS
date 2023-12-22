import { useEffect } from "react";
import "./index.css";
import { useTranscription } from "./hooks/useTranscription";
import { useUiUpdateBackendPoll } from "./hooks/useUiUpdateBackendPoll";
import { generateRandomUserId, setUserIdAndDeviceId } from "./utils/utils";
import Cookies from "js-cookie";
import StudyLayout from "./layouts/StudyLayout";
import { useTrackTabChange } from "./hooks/useTrackTabChange";
import MainLayout from "./layouts/MainLayout";
import { IS_STUDY } from "./constants";

export default function App() {
  useEffect(() => {
    let search = window.location.search;
    let params = new URLSearchParams(search);
    let userId = params.get('userId');

    if (userId == undefined || userId == null || userId == "") {
      console.log("No userID in URL - checking for existing userID");
      userId = Cookies.get("userId");
    }

    if (userId == undefined || userId == null || userId == "") {
      console.log("No userID detected - generating random userID");
      userId = generateRandomUserId();
    } else {
      console.log("userId found: " + userId);
    }
    setUserIdAndDeviceId(userId);
  }, []);

  return IS_STUDY ? <StudyApp /> : <MainApp />;
}

const MainApp = () => {
  useTranscription();
  useUiUpdateBackendPoll();

  return <MainLayout />;
};

const StudyApp = () => {
  useTrackTabChange();

  return <StudyLayout />;
};
