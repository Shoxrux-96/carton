import React from "react";
import { Image, ImageStyle, StyleProp, View } from "react-native";

const LOGO = require("../../assets/logo.png");

interface Props {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export default function AppLogo({ size = 36, style }: Props) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", backgroundColor: "#fff" }, style]}>
      <Image
        source={LOGO}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}
