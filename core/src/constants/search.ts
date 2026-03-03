const EXPLICIT_LANGUAGE_CODES = [
  "de",
  "en",
  "fr",
  "es",
  "it",
  "pt",
  "nl",
  "da",
  "fi",
  "no",
  "nb",
  "nn",
  "ru",
  "sv",
  "tr",
  "ro",
  "hu",
  "id",
] as const;

export const SEARCH_LANGUAGE_CODES = [
  "auto",
  ...EXPLICIT_LANGUAGE_CODES,
] as const;

/** Languages accepted for import (no "auto"). Use for import API schema. */
export const IMPORT_LANGUAGE_CODES = EXPLICIT_LANGUAGE_CODES;

export const AUTO_LANGUAGE_ERROR_MESSAGE =
  "Search language 'auto' is not supported yet; please pass an explicit language code.";

const FTS_CONFIG_BY_LANGUAGE: Record<string, string> = {
  de: "german",
  en: "english",
  fr: "french",
  es: "spanish",
  it: "italian",
  pt: "portuguese",
  nl: "dutch",
  da: "danish",
  fi: "finnish",
  no: "norwegian",
  nb: "norwegian",
  nn: "norwegian",
  ru: "russian",
  sv: "swedish",
  tr: "turkish",
  ro: "romanian",
  hu: "hungarian",
  id: "indonesian",
};

export function getFtsConfig(language: string): string {
  return FTS_CONFIG_BY_LANGUAGE[language] ?? "simple";
}
