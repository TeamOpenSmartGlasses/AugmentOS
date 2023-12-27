import { useEffect, useState } from "react";
import { useSetRecoilState } from "recoil";
import { tabChangesAtom } from "../recoil";

export const useTrackTabChange = () => {
  const setTabChanges = useSetRecoilState(tabChangesAtom);
  const [leaveTime, setLeaveTime] = useState(new Date());

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setTabChanges((prevVal) => [
          ...prevVal,
          { leaveTime, returnTime: new Date() },
        ]);
      } else {
        setLeaveTime(new Date());
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [leaveTime, setTabChanges]);
};
