import { en } from "./messages/en";
import { ko } from "./messages/ko";
import type { Locale, MessageKey } from "./types";
import { DEFAULT_LOCALE } from "./types";

const messages: Record<Locale, Record<MessageKey, string>> = { en, ko };

export function isLocale(value: string | undefined | null): value is Locale {
  return value === "en" || value === "ko";
}

export function resolveLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function translate(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  let text = messages[locale][key] ?? messages[DEFAULT_LOCALE][key] ?? key;

  if (params) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${name}\\}`, "g"), String(value));
    }
  }

  return text;
}

export { en, ko };
export type { Locale, MessageKey };
