import {
  ActionIcon,
  Box,
  Center,
  Skeleton,
  Text,
  Title,
  Button,
  createStyles,
  Tooltip,
} from "@mantine/core";
import { IconArrowUp } from "@tabler/icons-react";
import axiosClient from "../axiosConfig";
import { AGENT_RUN_ENDPOINT } from "../serverEndpoints";
import ChatBoxView from "./ChatBoxView";

const useStyles = createStyles((theme) => ({
}));

const AgentChatView = () => {
  const handleLoad = () => {
    setLoading(false);
  };

  const callSingleAgent = (agentName) => {
    const runAgentRequstBody = {
      agent_name: agentName, //list of features here
      userId: window.userId,
      deviceId: window.deviceId,
    };

    axiosClient
      .post(AGENT_RUN_ENDPOINT, runAgentRequstBody)
      .then((res) => {
        if (res.data.success) {
          const newEntities = res.data.result as any[];
          const newInsights = res.data.result_agent_insights as any[];
          if (newEntities.length === 0 && newInsights.length === 0) return;

          setEntities((entities) => [
            ...entities,
            ...newEntities,
            ...newInsights,
          ]);
        }
      })
      .catch(function (error) {
        console.error(error);
      });
  };

  const { classes, theme } = useStyles();

  return (
          <Box h={"100%"}>
          <Title 
            order={2}
            lineClamp={1}
              sx={{
                marginLeft: "0rem",
                textDecoration: "underline",
              }}
            >
             Agent Chat
          </Title>

          <Box h={"85%"}>
              <ChatBoxView />
          </Box>

        </Box>
    );
};

export default AgentChatView;
