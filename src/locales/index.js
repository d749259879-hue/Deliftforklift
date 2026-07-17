import { ASIAN_LOCALES } from "./asian.js";
import { BASE_LOCALES, LANGUAGE_OPTIONS } from "./base.js";
import { REGIONAL_LOCALES } from "./regional.js";
import { WESTERN_LOCALES } from "./western.js";


const LOCALES = {
  ...BASE_LOCALES,
  ...REGIONAL_LOCALES,
  ...WESTERN_LOCALES,
  ...ASIAN_LOCALES,
};


function mergeLocale(locale = {}) {
  const fallback = BASE_LOCALES.en;
  return {
    ui: {
      ...fallback.ui,
      ...locale.ui,
      nav: { ...fallback.ui.nav, ...locale.ui?.nav },
    },
    showroom: { ...fallback.showroom, ...locale.showroom },
    company: {
      ...fallback.company,
      ...locale.company,
      proofs: locale.company?.proofs || fallback.company.proofs,
    },
  };
}


export function getLocalePack(code) {
  return mergeLocale(LOCALES[code] || BASE_LOCALES.en);
}


export function getLanguage(code) {
  return LANGUAGE_OPTIONS.find((language) => language.code === code)
    || LANGUAGE_OPTIONS[0];
}


export function isChineseLocale(code) {
  return code === "zh";
}


export { LANGUAGE_OPTIONS } from "./base.js";
