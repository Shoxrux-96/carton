import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import uz from "./uz";
import ru from "./ru";

type Lang = "uz" | "ru";
type Translations = typeof uz;

const translations: Record<Lang, Translations> = { uz, ru };

interface I18nContextType {
  lang: Lang;
  t: (key: keyof Translations) => string;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextType>({
  lang: "uz",
  t: (key) => uz[key] || key,
  setLang: () => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("uz");

  useEffect(() => {
    AsyncStorage.getItem("app_language").then(saved => {
      if (saved === "uz" || saved === "ru") setLangState(saved);
    });
  }, []);

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    AsyncStorage.setItem("app_language", newLang);
  };

  const t = (key: keyof Translations): string => {
    return translations[lang][key] || translations.uz[key] || String(key);
  };

  return React.createElement(I18nContext.Provider, { value: { lang, t, setLang } }, children);
}

export function useI18n() {
  return useContext(I18nContext);
}

export type { Lang, Translations };
