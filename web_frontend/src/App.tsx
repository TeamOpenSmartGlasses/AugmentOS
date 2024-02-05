import { useEffect } from "react";
import "./index.css";
import { useTranscription } from "./hooks/useTranscription";
import { useUiUpdateBackendPoll } from "./hooks/useUiUpdateBackendPoll";
import Cookies from "js-cookie";
import MainLayout from "./layouts/MainLayout";
import { useRecoilState, useRecoilValue } from "recoil";
import { authTokenState, userIdState } from "./recoil";
import { useAuth } from "./auth";
import LandingPage from "./layouts/LandingPage";
import RootLayout from "./layouts/RootLayout";

export default function App() {
  useTranscription();
  useUiUpdateBackendPoll();
  useAuth();

  const [userId, setUserId] = useRecoilState(userIdState);
  const authToken = useRecoilValue(authTokenState);

  useEffect(() => {
    const search = window.location.search;
    const paramsUserId = new URLSearchParams(search).get("userId");
    const cookiesUserId = Cookies.get("userId");

    if (!paramsUserId) {
      console.log("No userID in URL - checking for existing userID");
      if (!cookiesUserId) {
        console.log("No userID detected - generating random userID");
      }
    }
    const foundUserId = paramsUserId ? paramsUserId : cookiesUserId;

    if (foundUserId) {
      console.log("userId found: " + foundUserId);
      setUserId(foundUserId);
      Cookies.set("userId", foundUserId, { expires: 9999 });
    } else {
      Cookies.set("userId", userId, { expires: 9999 });
    }
  }, [setUserId, userId]);

  return (
    <RootLayout>{authToken ? <MainLayout /> : <LandingPage />}</RootLayout>
  );
}
