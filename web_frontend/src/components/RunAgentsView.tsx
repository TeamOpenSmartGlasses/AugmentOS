import {
  ActionIcon,
  Box,
  Center,
  Flex,
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

interface RunAgentsViewProps {
  viewMoreUrl: string | undefined;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const useStyles = createStyles((theme) => ({
  agentButton: {
    height: 70,
    fontSize: "1.3rem",
    marginTop: "1rem",
    marginRight: "2rem",
    ":first-of-type": { marginTop: 0 },
    ":hover": {
      opacity: 0.7,
    },
  },
}));

const RunAgentsView = ({ viewMoreUrl, loading, setLoading }: RunAgentsViewProps) => {
  const handleLoad = () => {
    setLoading(false);
  };

  const callSingleAgent = (agentName) => {
    const runAgentRequstBody = {
      agentName: agentName, //list of features here
      userId: window.userId,
      deviceId: window.deviceId,
    };

    axiosClient
      .post(AGENT_RUN_ENDPOINT, runAgentRequstBody)
      .then((res) => {
        if (res.data.success) {
          const resMessage = res.data.message;
          console.log("Successfully ran agent.")
          console.log(resMessage);
        }
      })
      .catch(function (error) {
        console.log("Failed to run agent.")
        console.error(error);
      });
  };

  const { classes, theme } = useStyles();

  const makeAgentButtons = () => {
      const agentTypes = ["Statistician", "FactChecker", "DevilsAdvocate"];
      return agentTypes.map((agentName, index) => (
          <Button key={index} onClick={() => callSingleAgent(agentName)} value={agentName} justify="center" variant="filled" className={classes.agentButton}>
            {agentName}
          </Button>
        ));
      };

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
             Convo Agents
          </Title>
          <Flex
            justify={"space-evenly"}
            direction={"row"}
            wrap={"wrap"}
          >
              <Center>
                    <Box>
                        {makeAgentButtons()}
                    </Box>
                </Center>
            </Flex>
        </Box>
    );
};

export default RunAgentsView;
