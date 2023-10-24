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
import {
  AGENT_RUN_ENDPOINT,
  SEND_AGENT_CHAT_ENDPOINT,
} from "../serverEndpoints";
import { useEffect, useRef, useState } from "react";
import { Insight } from "../types";

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

interface ExplicitProps {
  insights: Insight;
}

const AgentChatView = ({insights}: ExplicitProps) => {
  insights;

  type Message = {
    sender: "user" | "bot";
    text: string;
  };

  const [messages, setMessages] = useState<Message[]>([
    { sender: "bot", text: "Hello! I'm here to help!" },
    //{ sender: "user", text: "fact check that last claim about bhutan" },
  ]);
  const [currentMessage, setCurrentMessage] = useState<string>("");

  const handleSendMessage = () => {
    setCurrentMessage("");

    if (currentMessage.trim()) {
      const payload = {
        userId: window.userId,
        deviceId: window.deviceId,
        chatMessage: currentMessage,
      };
      axiosClient
        .post(SEND_AGENT_CHAT_ENDPOINT, payload)
        .then((res) => {
          console.log(res);
        })
        .catch(console.log);

      setTimeout(() => {
      //TODO: [Grey out "Send" button until user query message comes through], OR, [display user's message & ignore the next query message]
      //setMessages([...messages, { sender: "user", text: currentMessage }]);

      setMessages((prevMessages) => [
           ...prevMessages,

           //TODO: Replace this "..." placeholder text with an actual animation
           { sender: "bot", text: "..." },
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

  useEffect(() => {
    console.log(messages);
    scrollToBottom();
  }, [messages]);

  useEffect(()=> {
    console.log('INSIGHTS:')
    console.log(insights)

    let insightsList = insights as any[];
    for (let i = 0; i < insightsList.length; i++) {
      if ('insight' in insightsList[i])
      {
        //Insight
        setMessages([...messages, { sender: "bot", text: insightsList[i]['insight'] }]);
      }
      else if ('query' in insightsList[i])
      {
        //Query
        setMessages([...messages, { sender: "user", text: insightsList[i]['query'] }]);
      }
    }

  }, [insights])

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
        {/*
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
        */}
      </Box>
    </Box>
  );
};

export default AgentChatView;
