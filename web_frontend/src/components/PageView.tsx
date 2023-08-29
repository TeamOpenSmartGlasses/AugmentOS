import { Box, Center, Skeleton, Text } from "@mantine/core";

interface PageViewProps {
  viewMoreUrl: string | undefined;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const PageView = ({ viewMoreUrl, loading, setLoading }: PageViewProps) => {
  const handleLoad = () => {
    setLoading(false);
  };
  return (
    <Box h={"100%"}>
      {viewMoreUrl ? (
        <Skeleton visible={loading} h={"100%"}>
          <iframe
            src={viewMoreUrl}
            onLoad={handleLoad}
            width="100%"
            height="100%"
            frameBorder={0}
          ></iframe>
        </Skeleton>
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
