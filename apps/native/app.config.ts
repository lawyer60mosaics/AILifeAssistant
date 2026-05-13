import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "AI Minutes",
  slug: "ai-minutes",
  scheme: "aiminutes",
  version: "0.1.0",
  orientation: "portrait",
  userInterfaceStyle: "light",
  newArchEnabled: true,
  splash: {
    backgroundColor: "#F5F7FB",
  },
  ios: {
    bundleIdentifier: "com.aiminutes.collector",
    supportsTablet: true,
    infoPlist: {
      NSMicrophoneUsageDescription:
        "AI Minutes needs microphone access to stream meeting audio to your local Hub.",
      NSLocalNetworkUsageDescription:
        "AI Minutes connects to the Hub running on your local network.",
      NSBonjourServices: ["_ai-minutes._tcp"],
    },
  },
  android: {
    package: "com.aiminutes.collector",
    permissions: ["RECORD_AUDIO", "INTERNET", "ACCESS_NETWORK_STATE"],
  },
  plugins: [
    [
      "expo-av",
      {
        microphonePermission:
          "AI Minutes needs microphone access to stream meeting audio to your local Hub.",
      },
    ],
  ],
};

export default config;
