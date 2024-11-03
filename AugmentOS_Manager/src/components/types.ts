import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Intro: undefined;
  Home: undefined;
  Register: undefined;
  Login: undefined;
  SettingsPage: undefined;
  ProfileSettings: undefined;
  GlassesMirror: undefined;
};

// Exporting NavigationProps based on RootStackParamList
export type NavigationProps = NativeStackNavigationProp<RootStackParamList>;
