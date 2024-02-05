import {
  Alert,
  Button,
  Flex,
  Group,
  // Divider,
  // FileButton,
  Modal,
  Image,
  Stack,
  Text,
  createStyles,
  rem,
  Checkbox,
  Textarea,
  Box,
  Affix,
  Title,
  List,
  SimpleGrid,
  Switch,
  TextInput,
  // Title,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import Cookies from "js-cookie";
import { useRef, useState } from "react";
import { AGENT_ICON_NAMES, AGENT_ICON_PATHS, AgentName } from "../types";
import { useRecoilState } from "recoil";
import { userIdState } from "../recoil";
// import axiosClient from "../axiosConfig";
// import { UPLOAD_USERDATA_ENDPOINT } from "../serverEndpoints";

interface SettingsModalProps {
  smallerThanMedium: boolean;
  opened: boolean;
  closeSettings: () => void;
}

const useStyles = createStyles((theme) => ({
  header: {
    backgroundColor: theme.colors.cardFill,
  },

  content: {
    backgroundColor: theme.colors.cardFill,
    border: `1.5px solid ${theme.colors.cardStroke}`,
  },
}));

enum SITUATIONS {
  BUSINESS = "Business",
  ACADEMIC = "Academic",
  SOCIAL = "Social",
  THINKING = "Thinking Alone",
}

const SettingsModal = ({
  smallerThanMedium,
  opened,
  closeSettings,
}: SettingsModalProps) => {
  const { classes } = useStyles();
  const [userId, setUserId] = useRecoilState(userIdState);
  const [isCustomUser, setIsCustomUser] = useState<boolean | undefined>(
    Cookies.get("isCustomUser") === "true"
  );
  // const [file, setFile] = useState<File | null>(null);

  const ref = useRef<HTMLInputElement>(null);
  const updateUsername = () => {
    if (ref.current?.value && ref.current.value !== "") {
      Cookies.set("isCustomUser", "true", { expires: 9999 });
      setIsCustomUser(true);
      setUserId(ref.current.value);
    }
  };

  // const submitCustomData = () => {
  //   if (!file || !userId) {
  //     return;
  //   }

  //   const formData = new FormData();
  //   formData.append("custom-file", file);
  //   formData.append("userId", userId);
  //   axiosClient
  //     .post(UPLOAD_USERDATA_ENDPOINT, formData, {
  //       headers: {
  //         "Content-Type": "multipart/form-data",
  //       },
  //     })
  //     .then((res: any) => {
  //       if(res.status == 200){
  //         alert(res.data);
  //       }
  //     })
  //     .catch(function (error: any) {
  //       console.error(error);
  //       alert(error.response.data);
  //     });
  // };

  return (
    <Modal
      id="settings-modal"
      size={"lg"}
      ml={smallerThanMedium ? 0 : 40}
      opened={opened}
      onClose={closeSettings}
      title={<Title>Settings</Title>}
      classNames={{ content: classes.content, header: classes.header }}
    >
      <Affix>
        <Alert
          icon={<IconInfoCircle />}
          title="Warning: you have unsaved changes."
          variant="light"
          color="red"
          mx="lg"
        >
          <Box />
        </Alert>
      </Affix>
      <Stack spacing="xl" px={0}>
        {/* <Alert
          icon={<IconInfoCircle />}
          title="Connect your custom data!"
          variant="light"
          color="blue"
        >
          Get started by setting a custom and unique username, then upload your
          CSV file containing your entity definitions
        </Alert> */}

        <Stack spacing="xs">
          {isCustomUser ? (
            <Title order={2}>
              Username found, logged in as{" "}
              <Text fw={700} component="span">
                {userId}
              </Text>
            </Title>
          ) : (
            <Title order={2}>No saved username</Title>
          )}

          <Group>
            <TextInput
              ref={ref}
              placeholder="Your new username"
              label="Set New Username"
              withAsterisk
              sx={{ flex: "1" }}
            />
            <Button onClick={updateUsername} variant="default" mt="auto">
              Set Username
            </Button>
          </Group>
        </Stack>
        {/*
        {isCustomUser && (
          <>
            <Divider my="sm" />
            <Title order={5}>Upload Custom Data</Title>
            <FileButton onChange={setFile} accept="csv">
              {(props) => (
                <Button variant="light" {...props}>
                  Upload CSV file
                </Button>
              )}
            </FileButton>
            {file && (
              <>
                <Text size="sm" align="center">
                  Picked file: {file.name}
                </Text>
                <Button onClick={submitCustomData}>Upload Data</Button>
              </>
            )}
          </>
        )}
        */}
        <Stack spacing="xs">
          <Group>
            <Title order={2}>Enabled Agents</Title>
            <Switch
              label="Use proactive agents"
              labelPosition="left"
              color="green"
              defaultChecked
              ml="auto"
            />
          </Group>
          <SimpleGrid cols={2}>
            {Object.entries(AgentName).map(([, agent]) => (
              <Flex>
                <Checkbox my="auto" />
                <Image
                  src={AGENT_ICON_PATHS[agent]}
                  height={rem(30)}
                  width={rem(30)}
                  mx="lg"
                />
                <Text transform="uppercase" fw="bold">
                  {AGENT_ICON_NAMES[agent]}
                </Text>
              </Flex>
            ))}
          </SimpleGrid>
        </Stack>

        <Stack spacing="xs">
          <Title order={2}>Biography</Title>
          <Textarea
            label={
              <>
                <Text>
                  What would you like Convoscope to know about you to provide
                  better responses?
                </Text>
                <List withPadding size="sm">
                  <List.Item>Where are you based?</List.Item>
                  <List.Item>What do you do for work?</List.Item>
                  <List.Item>What are your hobbies and interests?</List.Item>
                  <List.Item>What are some goals you have?</List.Item>
                </List>
              </>
            }
          />
          <Textarea
            label={
              <>
                <Text>
                  What would you like Convoscope to know about you to provide
                  better responses?
                </Text>
                <List withPadding size="sm">
                  <List.Item>
                    How often should Convoscope provide insights?
                  </List.Item>
                  <List.Item>
                    What types of conversations will you use Convoscope for?
                  </List.Item>
                  <List.Item>
                    What are some examples of things you'd like Convoscope to
                    do?
                  </List.Item>
                </List>
              </>
            }
          />
        </Stack>

        <Stack spacing="xs">
          <Title order={2}>Usage Situations</Title>
          <SimpleGrid cols={2}>
            {Object.entries(SITUATIONS).map(([, situation]) => (
              <Flex>
                <Checkbox mr="lg" my="auto" />
                <Text fw="bold" sx={{ letterSpacing: "0.1vh" }}>
                  {situation}
                </Text>
              </Flex>
            ))}
          </SimpleGrid>
        </Stack>

        <Button variant="default" ml="auto">
          Save
        </Button>
      </Stack>
    </Modal>
  );
};

export default SettingsModal;
