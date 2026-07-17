import categoryTranslations from "./categoryTranslations.generated.json";


export function getCategoryLabels(category, language = "en") {
  const code = String(language || "en").toLowerCase();
  const translations = categoryTranslations[category?.id] || {};
  const english = translations.en || category?.en || category?.id || "";
  const chinese = translations.zh || category?.zh || english;

  if (code === "zh") {
    return {
      primary: chinese,
      secondary: english,
      primaryLang: "zh",
      secondaryLang: "en",
      primaryDir: "ltr",
      secondaryDir: "ltr",
    };
  }

  if (code === "en") {
    return {
      primary: english,
      secondary: chinese,
      primaryLang: "en",
      secondaryLang: "zh",
      primaryDir: "ltr",
      secondaryDir: "ltr",
    };
  }

  return {
    primary: translations[code] || english,
    secondary: english,
    primaryLang: code,
    secondaryLang: "en",
    primaryDir: "ltr",
    secondaryDir: "ltr",
  };
}


export function getCategorySearchValues(category, language = "en") {
  const labels = getCategoryLabels(category, language);
  return [
    category?.id,
    labels.primary,
    labels.secondary,
    category?.zh,
    category?.en,
    category?.startCatalogPage,
    category?.endCatalogPage,
  ].filter(Boolean);
}
