import {
  ActionIcon,
  Skeleton,
  Tooltip,
  Flex,
  CloseButton,
  rem,
  Stack,
} from "@mantine/core";
import { IconArrowUp } from "@tabler/icons-react";

interface ExplorePaneProps {
  viewMoreUrl: string | undefined;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  onClose: () => void;
}

const ExplorePane = ({ viewMoreUrl, loading, setLoading, onClose }: ExplorePaneProps) => {
  const handleLoad = () => {
    setLoading(false);
  };

  return (
    <Flex sx={{ height: "100%" }}>
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
          id="zoomed-in-iframe"
          src={viewMoreUrl}
          onLoad={handleLoad}
          width="100%"
          height="100%"
          frameBorder={0}
        ></iframe>
      </Skeleton>
      <Stack align="center" w="3rem">
        <CloseButton onClick={onClose} size={rem(25)} mt="sm"/>
      </Stack>
    </Flex>
  );
};

export default ExplorePane;
