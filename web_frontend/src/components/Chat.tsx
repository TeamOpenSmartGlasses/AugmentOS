import {
  ActionIcon,
  Box,
  Flex,
  ScrollArea,
  Textarea,
  Text,
  Stack,
} from "@mantine/core";
import { IconArrowUp, IconFlower, IconUser } from "@tabler/icons-react";
import { PropsWithChildren, useEffect, useRef, useState } from "react";

enum Sender {
  MIRA = "Mira",
  USER = "You",
}

interface Message {
  sender: Sender;
  content: string;
}

const Chat = () => {
  const [intermediateQuery, setIntermediateQuery] = useState("");
  const [finalQuery, setFinalQuery] = useState("");
  const [history, setHistory] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const newUserQuery = () => {
    setHistory((prevHistory) => [
      ...prevHistory,
      { sender: Sender.USER, content: intermediateQuery },
    ]);
    setFinalQuery(intermediateQuery);
    setIntermediateQuery("");
    setIsLoading(true);
  };

  useEffect(() => {
    async function runGpt() {
      if (finalQuery == null || finalQuery == "") {
        return;
      }
      setIsLoading(false);
      setHistory((prevHistory) => [
        ...prevHistory,
        {
          sender: Sender.MIRA,
          content: "test",
        },
      ]);
    }

    runGpt();
  }, [finalQuery]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      // scroll to bottom of the scroll area
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [history]);

  return (
    <Flex h="100%" p="md" bg="rgb(52,53,65)" direction="column">
      {history.length === 0 && (
        <Stack m="auto">
          <Box w="3rem" h="3rem" m="auto">
            <IconUser
              color="white"
              size="3rem"
              style={{
                margin: "auto",
                background: "#acacbe",
                padding: "0.5rem",
                borderRadius: 100,
              }}
            />
          </Box>
          <Text fw="bolder" color="white" w="fit-content" m="auto" size="xl">
            Ask Mira
          </Text>
        </Stack>
      )}
      <ScrollArea viewportRef={scrollAreaRef}>
        {history.map((message) => (
          <MessageDisplay sender={message.sender}>
            {message.content.split("\n").map((p) => (
              <Text pb="xs">{p}</Text>
            ))}
          </MessageDisplay>
        ))}
        {isLoading && (
          <MessageDisplay sender={Sender.MIRA}>
            <Text pb="xs">
              <LoadingDots />
            </Text>
          </MessageDisplay>
        )}
      </ScrollArea>
      <Flex direction="row" mt="auto" gap="xs" w="100%">
        <Textarea
          value={intermediateQuery}
          autosize
          maxRows={8}
          onChange={(event) => setIntermediateQuery(event.currentTarget.value)}
          w="100%"
          placeholder="Message Mira..."
          sx={{
            "textarea, textarea:focus": {
              outline: "1px solid #8e8ea0",
              background: "rgba(0,0,0,0)",
            },
          }}
        />
        <ActionIcon
          variant="filled"
          size="lg"
          mt="auto"
          bg="black"
          onClick={newUserQuery}
        >
          <IconArrowUp size="1.125rem" />
        </ActionIcon>
      </Flex>
    </Flex>
  );
};

export default Chat;

const MessageDisplay = ({
  sender,
  children,
}: PropsWithChildren<{ sender: Sender }>) => {
  return (
    <Flex>
      <Box w="1.5rem" h="1.5rem" mr="xs">
        {sender === Sender.MIRA ? (
          <IconFlower
            color="white"
            size="1.5rem"
            style={{
              margin: "auto",
              background: "#19c37d",
              padding: "0.25rem",
              borderRadius: 100,
            }}
          />
        ) : (
          <IconUser
            color="white"
            size="1.5rem"
            style={{
              margin: "auto",
              background: "#acacbe",
              padding: "0.25rem",
              borderRadius: 100,
            }}
          />
        )}
      </Box>
      <Flex direction="column" pb="xl">
        <Text fw="bold">{sender}</Text>
        {children}
      </Flex>
    </Flex>
  );
};

const LoadingDots = () => {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (dots.length < 3) {
        setDots(dots + ".");
      } else {
        setDots(".");
      }
    }, 500);
    return () => clearInterval(intervalId);
  }, [dots]);

  return dots;
};
