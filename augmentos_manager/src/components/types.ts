import { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Intro: undefined;
  Home: undefined;
  Register: undefined;
  Login: undefined;
  SettingsPage: undefined;
  AppStore: undefined;
  PairPuckScreen: undefined; // Add this line

  AppDetails: { app: AppStoreItem };
  ProfileSettings: undefined;
  GlassesMirror: undefined;
  Reviews: { appId: string; appName: string }; // Add appName here
  SimulatedPuckSettings: undefined;
  PhoneNotificationSettings: undefined;
  SelectGlassesModelScreen: undefined;
  SelectGlassesBluetoothScreen: { glassesModelName: string };
  GlassesPairingGuideScreen: { glassesModelName: string };
};



export type AppStoreItem = {
  category: string;
  name: string;
  package_name: string;
  description: string;
  icon_image_url: string;
  identifier_code: string;
  rating: number;
  downloads: number;
  requirements: string[];
  screenshots?: string[]; // Add this line to include screenshots
  reviews?: {
      avatar: string; id: string; user: string; rating: number; comment: string
}[]; // Add reviews field


};

export type NavigationProps = NativeStackNavigationProp<RootStackParamList>;

