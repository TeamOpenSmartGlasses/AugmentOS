import { useEffect } from "react";
import { useSetRecoilState } from "recoil";
import { tabChangeCountAtom } from "../recoil";

export const useTrackTabChange = () => {
  const setTabChangeCount = useSetRecoilState(tabChangeCountAtom);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        setTabChangeCount((prevVal) => prevVal + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [setTabChangeCount]);
};
