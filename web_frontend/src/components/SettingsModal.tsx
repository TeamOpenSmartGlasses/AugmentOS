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
  TextInput,
  createStyles,
  rem,
  Checkbox,
  Textarea,
  Box,
  // Title,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import Cookies from "js-cookie";
import { useRef, useState } from "react";
import { AGENT_ICON_NAMES, AGENT_ICON_PATHS, AgentName } from "../types";
// import axiosClient from "../axiosConfig";
// import { UPLOAD_USERDATA_ENDPOINT } from "../serverEndpoints";

interface SettingsModalProps {
  smallerThanMedium: boolean;
  opened: boolean;
  closeSettings: () => void;
  setUserIdAndDeviceId: (newUserId: string) => void;
}

const useStyles = createStyles((theme) => ({
  header: {
    backgroundColor: theme.colors.cardFill,
  },

  content: {
    backgroundColor: theme.colors.cardFill,
    border: `1px solid ${theme.colors.cardStroke}`,
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
  setUserIdAndDeviceId,
}: SettingsModalProps) => {
  const { classes } = useStyles();
  const [userId, setUserId] = useState<string | undefined>(
    Cookies.get("userId")
  );
  const [isCustomUser, setIsCustomUser] = useState<boolean | undefined>(
    Cookies.get("isCustomUser") === "true"
  );
  // const [file, setFile] = useState<File | null>(null);

  const ref = useRef<HTMLInputElement>(null);
  const updateUsername = () => {
    if (ref.current?.value && ref.current.value !== "") {
      Cookies.set("isCustomUser", "true", { expires: 9999 });
      setUserIdAndDeviceId(ref.current?.value);
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
      title={<Text fw={700}>Settings</Text>}
      classNames={{ content: classes.content, header: classes.header }}
    >
      <Alert
        icon={<IconInfoCircle />}
        title="Warning: you have unsaved changes."
        variant="light"
        color="red"
        mx="lg"
      >
        <Box />
      </Alert>
      <Stack sx={{ gap: "4rem" }} p="lg">
        {/* <Alert
          icon={<IconInfoCircle />}
          title="Connect your custom data!"
          variant="light"
          color="blue"
        >
          Get started by setting a custom and unique username, then upload your
          CSV file containing your entity definitions
        </Alert> */}

        <Stack>
          <Text fw={700}>Username</Text>
          {isCustomUser ? (
            <Text>
              Username found, logged in as{" "}
              <Text fw={700} component="span">
                {userId}
              </Text>
            </Text>
          ) : (
            <Text>No saved username</Text>
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
        <Stack>
          <Text fw={700}>Enabled Agents</Text>

          {Object.entries(AgentName).map(([, agent]) => (
            <Flex>
              <Checkbox mr="lg" my="auto" />
              <Image
                src={AGENT_ICON_PATHS[agent]}
                height={rem(30)}
                width={rem(30)}
                radius="md"
                mx="lg"
              />
              <Text
                transform="uppercase"
                fw="bold"
                sx={{ letterSpacing: "0.1vh" }}
              >
                {AGENT_ICON_NAMES[agent]}
              </Text>
            </Flex>
          ))}
        </Stack>

        <Stack>
          <Text fw={700}>Biography</Text>
          <Textarea
            label={
              "What would you like Convoscope to know about you to provide better responses?"
            }
          />
          {/* TODO: thought setters */}
          <Textarea label={"How would you like Convoscope to behave?"} />
        </Stack>

        <Stack>
          <Text fw={700}>Usage Situations</Text>
          {Object.entries(SITUATIONS).map(([, situation]) => (
            <Flex>
              <Checkbox mr="lg" my="auto" />
              <Text fw="bold" sx={{ letterSpacing: "0.1vh" }}>
                {situation}
              </Text>
            </Flex>
          ))}
        </Stack>

        <Button variant="default" ml="auto">
          Save
        </Button>
      </Stack>
    </Modal>
  );
};

export default SettingsModal;
