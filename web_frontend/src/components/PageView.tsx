import { Box, Center, Text } from "@mantine/core";

interface PageViewProps {
  viewMoreUrl: string | undefined;
}

const PageView = ({ viewMoreUrl }: PageViewProps) => {
  return (
    <Box h={"100%"}>
      {viewMoreUrl ? (
        <iframe src={viewMoreUrl} width="100%" height="100%"></iframe>
      ) : (
        <Center h={"100%"}>
          <Text size={"xl"}>
            Click on a reference card for more information
          </Text>
        </Center>
      )}
    </Box>
  );
};

export default PageView;
