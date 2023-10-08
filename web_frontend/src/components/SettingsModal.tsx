import {
  Alert,
  Button,
  Divider,
  FileButton,
  Modal,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import Cookies from "js-cookie";
import { useRef, useState } from "react";
import axiosClient from "../axiosConfig";
import { UPLOAD_USERDATA_ENDPOINT } from "../serverEndpoints";

interface SettingsModalProps {
  smallerThanMedium: boolean;
  opened: boolean;
  closeSettings: () => void;
  setUserIdAndDeviceId: (newUserId: string) => void;
}

const SettingsModal = ({
  smallerThanMedium,
  opened,
  closeSettings,
  setUserIdAndDeviceId,
}: SettingsModalProps) => {
  const [userId, setUserId] = useState<string | undefined>(
    Cookies.get("userId")
  );
  const [isCustomUser, setIsCustomUser] = useState<boolean | undefined>(
    Cookies.get("isCustomUser") === "true"
  );
  const [file, setFile] = useState<File | null>(null);

  const ref = useRef<HTMLInputElement>(null);
  const updateUsername = () => {
    if (ref.current?.value && ref.current.value !== "") {
      Cookies.set("isCustomUser", "true", { expires: 9999 });
      setUserIdAndDeviceId(ref.current?.value);
      setIsCustomUser(true);
      setUserId(ref.current.value);
    }
  };

  const submitCustomData = () => {
    if (!file || !userId) {
      return;
    }

    let formData = new FormData();
    formData.append("custom-file", file);
    formData.append("userId", userId);
    axiosClient
      .post(UPLOAD_USERDATA_ENDPOINT, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((res: any) => {
        if(res.status == 200){
          alert(res.data);
        }
      })
      .catch(function (error: any) {
        console.error(error);
        alert(error.response.data);
      });
  };

  return (
    <Modal
      id="settings-modal"
      size={"md"}
      ml={smallerThanMedium ? 0 : 40}
      opened={opened}
      onClose={closeSettings}
      title={<Text fw={700}>Settings</Text>}
    >
      <Stack>
        <Alert icon={<IconInfoCircle />} title="Connect your custom data!">
          Get started by setting a custom and unique username, then upload your
          CSV file containing your entity definitions
        </Alert>

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

        <TextInput
          ref={ref}
          placeholder="Your new username"
          label="Set New Username"
          withAsterisk
        />
        <Button onClick={updateUsername}>Set Username</Button>

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
      </Stack>
    </Modal>
  );
};

export default SettingsModal;
