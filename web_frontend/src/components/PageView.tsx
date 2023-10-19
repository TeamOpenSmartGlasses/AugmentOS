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
import { useEffect, useState } from "react";

interface PageViewProps {
  viewMoreUrl: string | undefined;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const PageView = ({ viewMoreUrl, loading, setLoading }: PageViewProps) => {
  const [isHidden, setIsHidden] = useState(false);

  const handleLoad = () => {
    setLoading(false);
  };

  useEffect(() => {
    // reopen the explore pane when viewMoreUrl changes
    setIsHidden(false)
  }, [viewMoreUrl]);

  if (isHidden) {
    return null;
  }

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
          id="zoomed-out-iframe"
          src={viewMoreUrl}
          onLoad={handleLoad}
          width="100%"
          height="100%"
          frameBorder={0}
        ></iframe>
      </Skeleton>
      <Stack align="center" w="3rem">
        <CloseButton onClick={() => setIsHidden(true)} size={rem(25)} mt="sm"/>
      </Stack>
    </Flex>
  );
};

export default PageView;
