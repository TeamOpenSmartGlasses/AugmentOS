import {
  ActionIcon,
  Title,
  Box,
  Center,
  Skeleton,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconArrowUp } from "@tabler/icons-react";

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
    <Box h={"95%"}>
          <Title 
            order={2}
            lineClamp={1}
              sx={{
                marginLeft: "0rem",
                textDecoration: "underline",
              }}
            >
             Explore
          </Title>

      {viewMoreUrl ? (
        <Skeleton
          visible={loading}
          h={"100%"}
          w={"100%"}
          sx={{ position: "relative" }}
        >
          <Tooltip label="Open page in browser">
            <ActionIcon
              component="a"
              href={viewMoreUrl}
              target="_blank"
              variant="light"
              color="indigo"
              size="xl"
              radius="xl"
              sx={{ position: "absolute", right: 0, bottom: 0 }}
            >
              <IconArrowUp
                style={{ width: "70%", height: "70%" }}
                stroke={1.5}
              />
            </ActionIcon>
          </Tooltip>
          <iframe
            id="zoomed-out-iframe"
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
