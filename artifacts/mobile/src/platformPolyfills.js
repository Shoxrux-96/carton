import { Platform } from "react-native";

if (Platform.OS === "web") {
  const TurboModuleRegistry = require("react-native-web/dist/vendor/react-native/TurboModule/TurboModuleRegistry");

  const platformConstants = {
    reactNativeVersion: { major: 0, minor: 81, patch: 5 },
    forceTouchAvailable: false,
    isTesting: false,
    osVersion: "web",
  };

  const originalGet = TurboModuleRegistry.get;
  TurboModuleRegistry.get = function (name) {
    if (name === "PlatformConstants") return platformConstants;
    return originalGet(name);
  };

  const originalGetEnforcing = TurboModuleRegistry.getEnforcing;
  TurboModuleRegistry.getEnforcing = function (name) {
    if (name === "PlatformConstants") return platformConstants;
    return originalGetEnforcing(name);
  };
}
