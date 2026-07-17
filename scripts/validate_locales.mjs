import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ASIAN_LOCALES } from "../src/locales/asian.js";
import { BASE_LOCALES, LANGUAGE_OPTIONS } from "../src/locales/base.js";
import { REGIONAL_LOCALES } from "../src/locales/regional.js";
import { WESTERN_LOCALES } from "../src/locales/western.js";


const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATEGORY_TRANSLATIONS = JSON.parse(fs.readFileSync(
  path.join(ROOT, "src/categoryTranslations.generated.json"),
  "utf8",
));
const REPORT_PATH = path.join(ROOT, "scripts/localeCompleteness.validation.json");
const BANNED_LANGUAGES = new Set(["ar", "fa"]);
const OPTIONAL_PATHS = new Set(["ui.pagePrefix", "ui.pageSuffix"]);
const SHARED_COMPANY_PATHS = new Set([
  "company.companyName",
  "company.companySecondary",
  "company.address",
  "company.addressSecondary",
]);
const LOCALES = {
  ...BASE_LOCALES,
  ...REGIONAL_LOCALES,
  ...WESTERN_LOCALES,
  ...ASIAN_LOCALES,
};


function leafPaths(value, prefix = "") {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => leafPaths(item, `${prefix}.${index}`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) => (
      leafPaths(item, prefix ? `${prefix}.${key}` : key)
    ));
  }
  return [prefix];
}


function valueAt(value, dottedPath) {
  return dottedPath.split(".").reduce((current, key) => current?.[key], value);
}


function hasContent(value) {
  return typeof value === "number"
    || typeof value === "boolean"
    || (typeof value === "string" && value.trim().length > 0);
}


const languageCodes = LANGUAGE_OPTIONS.map(({ code }) => code);
const expectedLanguages = new Set(languageCodes);
const localeCodes = new Set(Object.keys(LOCALES));
const referencePaths = leafPaths(BASE_LOCALES.en)
  .filter((fieldPath) => !OPTIONAL_PATHS.has(fieldPath));
const missingLocaleFields = [];

for (const code of languageCodes) {
  const locale = LOCALES[code];
  if (!locale) {
    missingLocaleFields.push({ language: code, path: "<locale>" });
    continue;
  }
  for (const fieldPath of referencePaths) {
    const directValue = valueAt(locale, fieldPath);
    const value = SHARED_COMPANY_PATHS.has(fieldPath)
      ? (directValue ?? valueAt(BASE_LOCALES.en, fieldPath))
      : directValue;
    if (!hasContent(value)) {
      missingLocaleFields.push({ language: code, path: fieldPath });
    }
  }
}

const missingCategoryValues = [];
const extraCategoryLanguages = [];
let presentCategoryValues = 0;

for (const [categoryId, translations] of Object.entries(CATEGORY_TRANSLATIONS)) {
  for (const code of languageCodes) {
    if (!hasContent(translations[code])) {
      missingCategoryValues.push({ categoryId, language: code });
    } else {
      presentCategoryValues += 1;
    }
  }
  for (const code of Object.keys(translations)) {
    if (!expectedLanguages.has(code)) {
      extraCategoryLanguages.push({ categoryId, language: code });
    }
  }
}

const missingLocalePacks = languageCodes.filter((code) => !localeCodes.has(code));
const unexpectedLocalePacks = [...localeCodes].filter((code) => !expectedLanguages.has(code));
const bannedLanguagesPresent = languageCodes.filter((code) => BANNED_LANGUAGES.has(code));
const expectedCategoryValues = Object.keys(CATEGORY_TRANSLATIONS).length * languageCodes.length;
const status = (
  missingLocaleFields.length === 0
  && missingCategoryValues.length === 0
  && extraCategoryLanguages.length === 0
  && missingLocalePacks.length === 0
  && unexpectedLocalePacks.length === 0
  && bannedLanguagesPresent.length === 0
) ? "PASS" : "FAIL";

const report = {
  status,
  languageCount: languageCodes.length,
  languages: languageCodes,
  bannedLanguagesPresent,
  localeLeafFieldCount: referencePaths.length,
  missingLocalePackCount: missingLocalePacks.length,
  missingLocalePacks,
  unexpectedLocalePackCount: unexpectedLocalePacks.length,
  unexpectedLocalePacks,
  missingLocaleFieldCount: missingLocaleFields.length,
  missingLocaleFields,
  categoryCount: Object.keys(CATEGORY_TRANSLATIONS).length,
  expectedCategoryValues,
  presentCategoryValues,
  missingCategoryValueCount: missingCategoryValues.length,
  missingCategoryValues,
  extraCategoryLanguageCount: extraCategoryLanguages.length,
  extraCategoryLanguages,
  intentionallySharedCompanyFields: [...SHARED_COMPANY_PATHS],
};

fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (status !== "PASS") process.exitCode = 1;
