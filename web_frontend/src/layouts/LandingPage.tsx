import {
  Image,
  Box,
  Flex,
  Card,
  Title,
  Stack,
  rem,
  Button,
} from "@mantine/core";
import { useSignInWithGoogle } from "../auth";
import GoogleButton from "../components/GoogleButton";

const LandingPage = () => {
  const { signInWithGoogle } = useSignInWithGoogle();

  return (
    <Flex h="100%">
      <Box w="60%" p="xl">
        <Image src={"/blobs.gif"} fit="cover" />
      </Box>
      <Box w="40%" p="xl">
        <Card h="100%">
          <Stack>
            <Box w={rem(160)} mx="auto" mt={rem(102)}>
              <Image src={"/chat_bubbles_icon.svg"} />
            </Box>
            <Title m="auto" w="fit-content">
              Welcome!
            </Title>
            <GoogleButton
              mt="xl"
              onClick={signInWithGoogle}
              variant="default"
              w="fit-content"
              mx="auto"
            >
              Sign in with Google
            </GoogleButton>
          </Stack>
        </Card>
      </Box>
    </Flex>
  );
};

export default LandingPage;
