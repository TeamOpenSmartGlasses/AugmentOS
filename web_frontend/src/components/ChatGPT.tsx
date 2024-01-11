import {
  ActionIcon,
  Box,
  Flex,
  ScrollArea,
  Textarea,
  Text,
} from "@mantine/core";
import { IconArrowUp, IconFlower, IconUser } from "@tabler/icons-react";
import { useRef, useState } from "react";

enum Sender {
  CHATGPT = "ChatGPT",
  USER = "You",
}

interface Message {
  sender: Sender;
  content: string;
}

const ChatGPT = () => {
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<Message[]>([
    { sender: Sender.USER, content: "question question question question" },
    { sender: Sender.CHATGPT, content: "as a large language model i" },
    { sender: Sender.USER, content: "question question question question" },
    { sender: Sender.USER, content: "question question question question" },
    { sender: Sender.USER, content: "question question question question" },
    { sender: Sender.USER, content: "question question question question" },
    { sender: Sender.USER, content: "question question question question" },
    { sender: Sender.USER, content: "question question question question" },
    {
      sender: Sender.CHATGPT,
      content:
        "as a large language model i as a large language model i as a large language model i as a large language model i as a large language model i as a large language model\ni as a large language model i as a large language model i as a large language model i as a large language model i as a large language model i\nas a large language model i as a large language model i ",
    },
  ]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const newUserQuery = () => {
    setHistory((prevHistory) => [
      ...prevHistory,
      { sender: Sender.USER, content: query },
    ]);
    setQuery("");

    if (scrollAreaRef.current) {
      // scroll to bottom of the scroll area
      // FIXME: this doesn't work
      scrollAreaRef.current.scroll({
        top: scrollAreaRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  return (
    <Flex h="100%" p="md" bg="rgb(52,53,65)" direction="column">
      <ScrollArea ref={scrollAreaRef}>
        {history.map((message) => (
          <Flex>
            <Box w="1.5rem" h="1.5rem" mr="xs">
              {message.sender === Sender.CHATGPT ? (
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
              <Text fw="bold">{message.sender}</Text>
              {message.content.split("\n").map((p) => (
                <Text pb="xs">{p}</Text>
              ))}
            </Flex>
          </Flex>
        ))}
      </ScrollArea>
      <Flex direction="row" mt="auto" gap="xs" w="100%">
        <Textarea
          value={query}
          autosize
          maxRows={8}
          onChange={(event) => setQuery(event.currentTarget.value)}
          w="100%"
          placeholder="Message ChatGPT..."
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

export default ChatGPT;
