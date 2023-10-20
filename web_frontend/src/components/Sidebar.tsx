import { JSX } from "react";
import {
  Navbar,
  Tooltip,
  createStyles,
  Stack,
  ActionIcon,
} from "@mantine/core";
import { IconSettings, TablerIconsProps } from "@tabler/icons-react";
import TranscriptCard from "./TranscriptCard";

const useStyles = createStyles((theme) => ({
  link: {
    width: "3rem",
    height: "3rem",
    borderRadius: 100,
    borderWidth: 1.5,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
    <Navbar w={"8rem"} p="xl" bg={"rgba(0, 0, 0, 0)"} withBorder={false}>
      <Navbar.Section>
        <Stack m="auto" w="min-content">
          <TranscriptCard />  
        </Stack>
      </Navbar.Section>
      <Navbar.Section mt={"auto"}>
        <Stack m="auto" w="min-content">
          <NavbarLink
            icon={IconSettings}
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
