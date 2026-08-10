import th from "./th.js";
import en from "./en.js";

const dictionaries = { th, en };
let currentLocale = localStorage.getItem("medwell_locale") || "th";

export function setLocale(locale) {
  if (dictionaries[locale]) {
    currentLocale = locale;
    localStorage.setItem("medwell_locale", locale);
  }
}

export function getLocale() {
  return currentLocale;
}

export function t(key) {
  const keys = key.split(".");
  let value = dictionaries[currentLocale];

  for (const k of keys) {
    if (value === undefined) break;
    value = value[k];
  }

  // Fallback to Thai if English translation is missing
  if (value === undefined && currentLocale !== "th") {
    value = dictionaries["th"];
    for (const k of keys) {
      if (value === undefined) break;
      value = value[k];
    }
  }

  return value !== undefined ? value : key;
}
