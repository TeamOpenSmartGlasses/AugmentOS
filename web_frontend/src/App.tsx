import { useEffect } from "react";
import "./index.css";
import { useTranscription } from "./hooks/useTranscription";
import { useUiUpdateBackendPoll } from "./hooks/useUiUpdateBackendPoll";
import { generateRandomUserId, setUserIdAndDeviceId } from "./utils/utils";
import Cookies from "js-cookie";
import MainLayout from "./layouts/MainLayout";

export default function App() {
  useTranscription();
  useUiUpdateBackendPoll();

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

  return <MainLayout />;
}
