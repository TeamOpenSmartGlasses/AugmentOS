import { Box, Modal, Text } from "@mantine/core";
import Cookies from "js-cookie";

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
  let userId = Cookies.get("userId");
  let isCustomUser = Cookies.get("isCustomUser");

  return (
    <Modal
      id="settings-modal"
      size={"md"}
      ml={smallerThanMedium ? 0 : 40}
      opened={opened}
      onClose={closeSettings}
      title={<Text fw={700}>Settings</Text>}
    >
      <Box h={"300px"}>
        {isCustomUser ? <>Logged In</> : <>Not Logged In</>}
      </Box>
    </Modal>
  );
};

export default SettingsModal;
