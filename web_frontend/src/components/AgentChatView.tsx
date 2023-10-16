import "@chatscope/chat-ui-kit-styles/dist/default/styles.min.css";
import {
  Box,
  Text,
  Title,
  Button,
  Avatar,
  Input,
  ScrollArea,
  Group,
  Stack,
} from "@mantine/core";
import axiosClient from "../axiosConfig";
import { AGENT_RUN_ENDPOINT } from "../serverEndpoints";
import { useEffect, useRef, useState } from "react";

// const useStyles = createStyles((theme) => ({}));

const HumanChatBubble = (text: string) => {
  return (
    <Group position="right">
      <Button radius={"xl"} component={Text}>
        {text}
      </Button>
      <Avatar src={"default_user_avatar.jpg"} alt={`user avatar`} />
    </Group>
  );
};

const BotChatBubble = (text: string) => {
  return (
    <Group position="left">
      <Avatar src={"ConvoscopeLogoScaled.png"} alt={`user avatar`} />
      <Button radius={"xl"} component={Text}>
        {text}
      </Button>
    </Group>
  );
};

const AgentChatView = () => {
  // const handleLoad = () => {
  //   setLoading(false);
  // };

  const callSingleAgent = (agentName: string) => {
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

          // setEntities((entities) => [
          //   ...entities,
          //   ...newEntities,
          //   ...newInsights,
          // ]);
        }
      })
      .catch(function (error) {
        console.error(error);
      });
  };

  // const { classes, theme } = useStyles();

  type Message = {
    sender: "user" | "bot";
    text: string;
  };

  const [messages, setMessages] = useState<Message[]>([
    { sender: "bot", text: "Hello! I'm here to help!" },
    { sender: "bot", text: "What would you like to know?" },
    { sender: "user", text: "fact check that last claim about bhutan" },
    { sender: "user", text: "fact check that last claim about bhutan" },
    { sender: "user", text: "fact check that last claim about bhutan" },
    { sender: "user", text: "fact check that last claim about bhutan" },
    { sender: "user", text: "fact check that last claim about bhutan" },
  ]);
  const [currentMessage, setCurrentMessage] = useState<string>("");

  const handleSendMessage = () => {
    if (currentMessage.trim()) {
      setMessages([...messages, { sender: "user", text: currentMessage }]);
      setCurrentMessage("");
      // Simulate a bot response
      setTimeout(() => {
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: "bot", text: "Bot response" },
        ]);
      }, 1000);
    }
  };

  const handleEnter = (e) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  const chatRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    chatRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  };

  const sendNewMessage = () => {
    setMessages([...messages, { sender: "user", text: currentMessage }]);
    setCurrentMessage("");
  };

  useEffect(() => {
    console.log(messages)
    scrollToBottom();
  }, [messages]);

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
        <ScrollArea h={"85%"} my={10} p={5} offsetScrollbars>
          <Stack>
            {messages.map((message, index) => {
              if (message.sender === "user") {
                return HumanChatBubble(message.text);
              }
              return BotChatBubble(message.text);
            })}
            <div ref={chatRef} />
          </Stack>
        </ScrollArea>
        <div className="chat-input">
          <Input
            value={currentMessage}
            onChange={(e) => setCurrentMessage(e.currentTarget.value)}
            onKeyDown={handleEnter}
            placeholder="Type a message"
            rightSection={
              <Button onClick={handleSendMessage} color="blue">
                Send
              </Button>
            }
            rightSectionWidth={70}
          />
        </div>
      </Box>
    </Box>
  );
};

export default AgentChatView;
