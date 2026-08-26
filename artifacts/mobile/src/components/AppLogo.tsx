import React from "react";
import { Image, ImageStyle, StyleProp } from "react-native";

const LOGO = require("../../assets/logo.png");

interface Props {
  size?: number;
  style?: StyleProp<ImageStyle>;
}

export default function AppLogo({ size = 36, style }: Props) {
  return (
    <Image
      source={LOGO}
      style={[{ width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}
