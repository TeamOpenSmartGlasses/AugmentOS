import { ColorScheme, rem } from "@mantine/core";

export const theme = {
  colorScheme: "dark" as ColorScheme,
  colors: {
    cardFill: ["hsla(231, 28%, 13%, 1)"],
    titleText: ["hsla(240, 31%, 87%, 1)"],
    bodyText: ["hsla(240, 27%, 73%, 1)"],
    cardStroke: ["hsla(227, 33%, 27%, 1)"],
    convoscopeBlue: ["hsla(200, 99%, 53%, 1)"],
    iconColor: ["hsla(227, 40%, 63%, 1)"],
  } as Record<
    string,
    [
      (string | undefined)?,
      (string | undefined)?,
      (string | undefined)?,
      (string | undefined)?,
      (string | undefined)?,
      (string | undefined)?,
      (string | undefined)?,
      (string | undefined)?,
      (string | undefined)?,
      (string | undefined)?
    ]
  >,
  primaryColor: "convoscopeBlue",

  defaultGradient: {
    from: "hsla(174, 78%, 49%, 1)",
    to: "hsla(174, 90%, 36%, 1)",
  },

  fontFamily: "Inter, sans-serif",
  fontFamilyMonospace: "Inter, monospace",
  headings: { fontFamily: "Inter, sans-serif" },
};

export const cardStyles = {
  backgroundColor: theme.colors.cardFill,
  color: theme.colors.titleText,
  border: `1.5px solid ${theme.colors.cardStroke}`,
  borderRadius: rem(30),
  boxShadow: "15px 15px 40px 0px rgba(0, 0, 0, 0.40)",
};
