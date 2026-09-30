import React, { forwardRef } from "react";
import { Platform, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

interface Props {
  html: string;
  onLoad?: () => void;
  onMessage?: (event: any) => void;
}

// Xarita konteyneri:
// - web: oddiy <iframe srcDoc> (react-native-webview web platformani qo'llab-quvvatlamaydi)
// - native: WebView
export const MapFrame = forwardRef(function MapFrame({ html, onLoad, onMessage }: Props, ref: any) {
  if (Platform.OS === "web") {
    return React.createElement("iframe", {
      ref,
      srcDoc: html,
      title: "map",
      onLoad,
      style: {
        border: "none",
        width: "100%",
        height: "100%",
        display: "block",
        flex: 1,
      },
    });
  }
  return (
    <WebView
      ref={ref}
      source={{ html }}
      style={styles.fill}
      onLoad={onLoad}
      onMessage={onMessage}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={["*"]}
    />
  );
});

// Xaritaga xabar yuborish (web: iframe.contentWindow, native: WebView.postMessage)
export function postMap(ref: any, msg: any): void {
  try {
    const el = ref?.current;
    if (!el) return;
    const data = JSON.stringify(msg);
    if (el.contentWindow && typeof el.contentWindow.postMessage === "function") {
      el.contentWindow.postMessage(data, "*");
    } else if (typeof el.postMessage === "function") {
      el.postMessage(data);
    }
  } catch {}
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
