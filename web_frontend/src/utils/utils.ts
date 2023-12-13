import Cookies from "js-cookie";

export const generateRandomUserId = () => {
  const rand = "x"
    .repeat(5)
    .replace(
      /./g,
      () =>
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[
          Math.floor(Math.random() * 62)
        ]
    );
  return "WebFrontend_" + rand;
};

export const setUserIdAndDeviceId = (newUserId: string) => {
  window.userId = newUserId;
  Cookies.set("userId", newUserId, { expires: 9999 });
  window.deviceId = "CSEWebFrontendDefault";
};
