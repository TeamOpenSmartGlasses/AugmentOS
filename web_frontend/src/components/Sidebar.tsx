import { JSX } from "react";
import {
  Navbar,
  Tooltip,
  createStyles,
  Stack,
  rem,
  ActionIcon,
} from "@mantine/core";
import { IconDots, TablerIconsProps } from "@tabler/icons-react";
import TranscriptCard from "./TranscriptCard";

const useStyles = createStyles((theme) => ({
  link: {
    width: rem(66),
    height: rem(66),
    borderRadius: 100,
    borderWidth: 1.5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color:
      theme.colorScheme === "dark"
        ? theme.colors.dark[0]
        : theme.colors.gray[7],

    "&:hover": {
      backgroundColor:
        theme.colorScheme === "dark"
          ? theme.colors.dark[5]
          : theme.colors.gray[0],
    },
  },

  active: {
    "&, &:hover": {
      backgroundColor: theme.fn.variant({
        variant: "light",
        color: theme.primaryColor,
      }).background,
      color: theme.fn.variant({ variant: "light", color: theme.primaryColor })
        .color,
    },
  },
}));

interface NavbarLinkProps {
  icon: (props: TablerIconsProps) => JSX.Element;
  label: string;
  active?: boolean;
  onClick?(): void;
}

export function NavbarLink({
  icon: Icon,
  label,
  active,
  onClick,
}: NavbarLinkProps) {
  const { classes, cx } = useStyles();
  return (
    <Tooltip label={label} position="right" transitionProps={{ duration: 0 }}>
      <ActionIcon
        variant={"outline"}
        radius={100}
        onClick={onClick}
        className={cx(classes.link, { [classes.active]: active })}
      >
        <Icon size="2rem" stroke={3} />
      </ActionIcon>
    </Tooltip>
  );
}

interface NavbarMinimalProps {
  settingsOpened: boolean;
  toggleSettings: () => void;
}

export function NavbarMinimal({
  settingsOpened,
  toggleSettings,
}: NavbarMinimalProps) {
  return (
    <Navbar width={{ base: "7rem" }} p="md" bg={"rgba(0, 0, 0, 0)"} withBorder={false}>
      <Navbar.Section>
        <Stack justify="center" spacing={0}>
          <TranscriptCard />  
        </Stack>
      </Navbar.Section>
      <Navbar.Section mt={"auto"}>
        <Stack justify="center" spacing={0}>
          <NavbarLink
            icon={IconDots}
            label={"Settings"}
            active={settingsOpened}
            onClick={toggleSettings}
          />
        </Stack>
      </Navbar.Section>
    </Navbar>
  );
}

export default NavbarMinimal;
