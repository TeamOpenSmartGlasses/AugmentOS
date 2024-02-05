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
