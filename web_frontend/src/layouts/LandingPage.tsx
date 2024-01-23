import {
  Image,
  Box,
  Flex,
  Card,
  Title,
  Stack,
  rem,
  createStyles,
} from "@mantine/core";
import { useSignInWithGoogle } from "../auth";
import GoogleButton from "../components/GoogleButton";
import { cardStyles } from "../theme";

const useStyles = createStyles(() => ({
  card: {
    ...cardStyles,
  },
}));

const LandingPage = () => {
  const { classes } = useStyles();
  const { signInWithGoogle } = useSignInWithGoogle();

  return (
    <Flex h="100%">
      <Box w="60%" p="xl">
        <Image src={"/blobs.gif"} fit="cover" />
      </Box>
      <Box w="40%" p="xl">
        <Card h="100%" className={classes.card}>
          <Stack>
            <Box w={rem(160)} mx="auto" mt={rem(102)}>
              <Image src={"/chat_bubbles_icon.svg"} />
            </Box>
            <Title m="auto" w="fit-content">
              Welcome!
            </Title>
            <GoogleButton
              mt="10rem"
              onClick={signInWithGoogle}
              variant="default"
              w="fit-content"
              mx="auto"
              size="xl"
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
