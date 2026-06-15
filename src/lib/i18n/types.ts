export type Locale = "en" | "ko";

export const LOCALE_COOKIE = "astocks-locale";
export const LOCALE_STORAGE_KEY = "astocks-locale";
export const DEFAULT_LOCALE: Locale = "en";

export type MessageKey = keyof typeof import("./messages/en").en;
