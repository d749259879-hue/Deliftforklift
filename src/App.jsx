import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Copy,
  ListFilter,
  Mail,
  Menu,
  Search,
  X,
} from "lucide-react";
import {
  categories as catalogCategories,
  products as catalogProducts,
} from "./catalogData.js";
import ShowroomStage from "./components/ShowroomStage.jsx";
import CompanyTrustStrip from "./components/CompanyTrustStrip.jsx";
import LanguageMenu from "./components/LanguageMenu.jsx";
import { getCategoryLabels, getCategorySearchValues } from "./categoryI18n.js";
import { getLanguage, getLocalePack, isChineseLocale } from "./locales/index.js";


const ICONS = {
  search: Search,
  arrow: ArrowRight,
  menu: Menu,
  close: X,
  copy: Copy,
  mail: Mail,
  previous: ChevronLeft,
  next: ChevronRight,
  category: ListFilter,
  check: Check,
  clear: CircleX,
};


const HERO_CATEGORY_IDS = [
  "brake-master-cylinder",
  "oil-pump",
  "torque-converter",
  "power-steering-cylinder",
  "tilt-rod",
  "switch",
];


const RAIL_CATEGORY_IDS = [
  ...HERO_CATEGORY_IDS,
  "brake-wheel-cylinder-assembly-p015",
  "universal-joint-drive-shaft-propeller-shaft-p025",
  "knuckle-steer-stub-axle-p061",
  "king-pin-p171",
  "clutch-master-cylinder-assembly-p011",
  "clutch-slave-cylinder-assembly-p013",
  "brake-clutch-master-cylinder-kit-p023",
  "booster-air-tank-p024",
  "pump-seat-p029",
  "cross-spider-p030",
  "shaft-assembly-p033",
  "pulley-coupling-p037",
  "brake-drum-p097",
  "brake-shoe-p102",
];


const EXCLUDED_CATEGORY_IDS = new Set([
  "roller-bearing-p304",
  "side-thrust-roller-p337",
  "connecting-seat-bearing-p344",
  "cable-p267",
  "brake-cable-p272",
]);


const products = (Array.isArray(catalogProducts) ? catalogProducts : [])
  .filter((product) => !EXCLUDED_CATEGORY_IDS.has(product.category));
const exportedCategories = (Array.isArray(catalogCategories) ? catalogCategories : [])
  .filter((category) => (
    !EXCLUDED_CATEGORY_IDS.has(category.id)
    && category.productCount !== 0
    && category.estimatedValidCellCount !== 0
  ));
const exportedCategoryIds = new Set(exportedCategories.map((category) => category.id));
const derivedCategories = [...new Set(products.map((product) => product.category).filter(Boolean))]
  .filter((categoryId) => !exportedCategoryIds.has(categoryId))
  .map((categoryId) => ({
    id: categoryId,
    zh: categoryId,
    en: categoryId,
  }));
const categories = [...exportedCategories, ...derivedCategories];
const heroCategories = HERO_CATEGORY_IDS
  .map((categoryId) => categories.find((category) => category.id === categoryId))
  .filter(Boolean)
  .slice(0, 6);
const railCategories = RAIL_CATEGORY_IDS
  .map((categoryId) => categories.find((category) => category.id === categoryId))
  .filter(Boolean);
const RAIL_CATEGORY_ID_SET = new Set(railCategories.map((category) => category.id));
const PAGE_CONNECTOR_LOCALES = new Set(["ru", "hi"]);
const DEFAULT_CATEGORY_ID = heroCategories[0]?.id || categories[0]?.id || "";
const PRODUCT_COUNTS = products.reduce((counts, product) => {
  counts[product.category] = (counts[product.category] || 0) + 1;
  return counts;
}, {});


const PRODUCTS_PER_PAGE = 12;


function Icon({ name, className = "" }) {
  const IconComponent = ICONS[name] || ArrowRight;
  return <IconComponent className={`ui-icon ${className}`} aria-hidden="true" strokeWidth={1.8} />;
}


function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}


function productSearchValues(product) {
  return [
    product.partNo,
    ...(Array.isArray(product.partAliases) ? product.partAliases : []),
    product.catalogCode,
    ...(Array.isArray(product.catalogAliases) ? product.catalogAliases : []),
    product.model,
  ].filter(Boolean);
}


function productPrimaryLabel(product) {
  return product.partNo || product.catalogCode || product.model || product.id;
}


function getBrand(product) {
  const brand = String(product.model || "").split(/[\s/]/)[0]?.trim();
  return brand || "DELIFT";
}


function Header({ lang, onSelectLanguage, onNavigate, onHome }) {
  const t = getLocalePack(lang).ui;
  const [menuOpen, setMenuOpen] = useState(false);

  function navigate(target) {
    setMenuOpen(false);
    onNavigate(target);
  }

  return (
    <header className="site-header">
      <button className="brand-button" type="button" onClick={onHome} aria-label={t.home}>
        <img src="/assets/delift-logo.png" alt="Delift" />
      </button>

      <button
        className="mobile-menu"
        type="button"
        aria-expanded={menuOpen}
        aria-controls="primary-navigation"
        aria-label={menuOpen ? t.closeMenu : t.menu}
        onClick={() => setMenuOpen((current) => !current)}
      >
        <Icon name={menuOpen ? "close" : "menu"} />
      </button>

      <nav id="primary-navigation" className={menuOpen ? "primary-navigation is-open" : "primary-navigation"}>
        <button type="button" onClick={() => navigate("products")}>{t.nav.products}</button>
        <button type="button" onClick={() => navigate("company")}>{t.nav.company}</button>
        <button type="button" onClick={() => navigate("company")}>{t.nav.contact}</button>
      </nav>

      <span className="header-divider" aria-hidden="true" />
      <LanguageMenu value={lang} onChange={onSelectLanguage} />

    </header>
  );
}


function IntroScreen({ lang, onExplore, onSelectCategory }) {
  const showroomItems = useMemo(
    () => heroCategories.map((category) => ({ id: category.id, ...getCategoryLabels(category, lang) })),
    [lang],
  );
  return (
    <main className="intro-screen" id="top">
      <ShowroomStage
        variant="intro"
        lang={lang}
        items={showroomItems}
        onExplore={onExplore}
        onSelectCategory={onSelectCategory}
      />
    </main>
  );
}


function CategoryRail({ lang, activeCategory, onSelect }) {
  const t = getLocalePack(lang).ui;
  const [categoryQuery, setCategoryQuery] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const activeMoreCategoryRef = useRef(null);
  const categoryScrollRef = useRef(null);
  const moreButtonRef = useRef(null);
  const moreCategories = useMemo(
    () => categories.filter((category) => !RAIL_CATEGORY_ID_SET.has(category.id)),
    [],
  );
  const filteredCategories = useMemo(() => {
    const value = normalize(categoryQuery);
    if (!value) return moreCategories;
    return moreCategories.filter((category) => normalize(
      getCategorySearchValues(category, lang).join(" "),
    ).includes(value));
  }, [categoryQuery, lang, moreCategories]);
  const activeMoreCategory = moreCategories.find((category) => category.id === activeCategory);

  useEffect(() => {
    setCategoryQuery("");
  }, [activeCategory]);

  useEffect(() => {
    if (!catalogOpen) return undefined;
    window.requestAnimationFrame(() => {
      const activeButton = activeMoreCategoryRef.current;
      const scrollArea = categoryScrollRef.current;
      if (!activeButton || !scrollArea) return;
      const buttonRect = activeButton.getBoundingClientRect();
      const scrollRect = scrollArea.getBoundingClientRect();
      if (buttonRect.top < scrollRect.top) {
        scrollArea.scrollBy({ top: buttonRect.top - scrollRect.top - 30, behavior: "smooth" });
      } else if (buttonRect.bottom > scrollRect.bottom) {
        scrollArea.scrollBy({ top: buttonRect.bottom - scrollRect.bottom + 30, behavior: "smooth" });
      }
    });
    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setCatalogOpen(false);
        moreButtonRef.current?.focus();
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activeCategory, catalogOpen]);

  function chooseCategory(categoryId) {
    onSelect(categoryId);
    setCatalogOpen(false);
  }

  function renderCategory(category, inFullCatalog = false) {
    const categoryIndex = (inFullCatalog ? categories : railCategories)
      .findIndex((item) => item.id === category.id);
    const selected = activeCategory === category.id;
    const count = PRODUCT_COUNTS[category.id] ?? category.productCount ?? 0;
    const labels = getCategoryLabels(category, lang);
    return (
      <button
        key={category.id}
        ref={selected && inFullCatalog ? activeMoreCategoryRef : null}
        type="button"
        className={selected ? "is-active" : ""}
        aria-pressed={selected}
        title={`${labels.primary} · ${count}`}
        onClick={() => chooseCategory(category.id)}
      >
        <span className="category-rail__number">{String(categoryIndex + 1).padStart(2, "0")}</span>
        <span className="category-rail__copy">
          <strong lang={labels.primaryLang} dir={labels.primaryDir}>{labels.primary}</strong>
          <small lang={labels.secondaryLang} dir={labels.secondaryDir}>{labels.secondary}</small>
        </span>
        <span className="category-rail__count" aria-label={`${count} ${t.results}`}>{count}</span>
      </button>
    );
  }

  return (
    <aside className="category-rail" aria-label={t.allCategories}>
      <div className="category-rail__mobile-select">
        <label htmlFor="mobile-category-select">
          <Icon name="category" />
          <span><strong>{t.allCategories}</strong><small>{categories.length} {t.categories}</small></span>
        </label>
        <select
          id="mobile-category-select"
          value={categories.some((category) => category.id === activeCategory) ? activeCategory : DEFAULT_CATEGORY_ID}
          onChange={(event) => onSelect(event.target.value)}
        >
          {categories.map((category) => {
            const labels = getCategoryLabels(category, lang);
            return (
              <option key={category.id} value={category.id}>
                {labels.primary} / {labels.secondary} ({PRODUCT_COUNTS[category.id] ?? category.productCount ?? 0})
              </option>
            );
          })}
        </select>
      </div>

      <div className="category-rail__heading category-rail__desktop-only">
        <Icon name="category" />
        <span>
          <strong>{t.allCategories}</strong>
          <small>{categories.length} {t.categories} · {t.fullCatalog}</small>
        </span>
      </div>

      <div className="category-rail__list category-rail__hero-list category-rail__desktop-only">
        {railCategories.map((category) => renderCategory(category))}
      </div>

      <button
        ref={moreButtonRef}
        className={`category-rail__more category-rail__desktop-only${activeMoreCategory ? " is-active" : ""}`}
        type="button"
        aria-expanded={catalogOpen}
        aria-controls="full-category-panel"
        onClick={() => setCatalogOpen((open) => !open)}
      >
        <Icon name="category" />
        <span>
          <strong>{activeMoreCategory
            ? getCategoryLabels(activeMoreCategory, lang).primary
            : t.moreCategories}</strong>
          <small>{moreCategories.length} {t.fullBookCategories}</small>
        </span>
        <Icon name="arrow" />
      </button>

      {catalogOpen ? (
        <>
          <button
            className="category-panel__backdrop category-rail__desktop-only"
            type="button"
            aria-label={t.closeFullCatalog}
            onClick={() => setCatalogOpen(false)}
          />
          <section
            id="full-category-panel"
            className="category-panel category-rail__desktop-only"
            aria-label={t.fullCatalog}
          >
            <header className="category-panel__header">
              <span><strong>{t.fullCatalog}</strong><small>{moreCategories.length} {t.categories}</small></span>
              <button type="button" onClick={() => setCatalogOpen(false)} aria-label={t.close}>
                <Icon name="close" />
              </button>
            </header>
            <label className="category-rail__search">
              <Icon name="search" />
              <input
                type="search"
                value={categoryQuery}
                onChange={(event) => setCategoryQuery(event.target.value)}
                placeholder={t.searchCategories}
                aria-label={t.searchCategories}
                autoFocus
              />
            </label>
            <div ref={categoryScrollRef} className="category-panel__scroll">
              <div className="category-rail__list category-panel__list">
                {filteredCategories.map((category) => renderCategory(category, true))}
              </div>
              {filteredCategories.length === 0 ? (
                <p className="category-rail__empty">{t.noMatchingCategories}</p>
              ) : null}
            </div>
            <p className="category-panel__status">{filteredCategories.length} / {moreCategories.length}</p>
          </section>
        </>
      ) : null}
    </aside>
  );
}


function SearchToolbar({ lang, query, onQueryChange, onSubmit, suggestions, onPick, status, onClear }) {
  const t = getLocalePack(lang).ui;
  return (
    <div className="catalog-toolbar">
      <form className="catalog-search" onSubmit={onSubmit}>
        <label htmlFor="catalog-search-input">{isChineseLocale(lang) ? `${t.searchLabel} / Part No.` : t.searchLabel}</label>
        <div className="catalog-search__control">
          <input
            id="catalog-search-input"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t.searchPlaceholder}
            autoComplete="off"
            spellCheck="false"
          />
          {query ? (
            <button className="catalog-search__clear" type="button" onClick={onClear} aria-label={t.clearSearch}>
              <Icon name="clear" />
            </button>
          ) : null}
          <button className="catalog-search__submit" type="submit" aria-label={t.searchButton}>
            <Icon name="search" />
          </button>
        </div>
        {suggestions.length ? (
          <div className="search-suggestions" role="listbox" aria-label={t.searchLabel}>
            {suggestions.map((product) => (
              <button key={product.id} type="button" role="option" onClick={() => onPick(product)}>
                <img src={product.cellImage} alt="" />
                <span>
                  <strong>{productPrimaryLabel(product)}</strong>
                  <small>{[product.catalogCode, product.model].filter(Boolean).join(" · ") || "Delift"}</small>
                </span>
                <Icon name="arrow" />
              </button>
            ))}
          </div>
        ) : null}
      </form>
      <p className={`search-feedback search-feedback--${status}`} aria-live="polite">
        {status === "error" ? t.noResult : status === "success" ? t.matchFound : ""}
      </p>
    </div>
  );
}


function ProductCard({ product, lang, selected, highlighted, onOpen }) {
  const t = getLocalePack(lang).ui;
  const productLabel = productPrimaryLabel(product);
  return (
    <button
      id={`product-${product.id}`}
      className={`catalog-product${selected ? " is-selected" : ""}${highlighted ? " is-highlighted" : ""}`}
      type="button"
      onClick={() => onOpen(product)}
      aria-label={`${t.details}: ${productLabel}`}
    >
      <img src={product.cellImage} alt={`${productLabel} ${product.model || "Delift"}`} loading="lazy" />
      <span className="catalog-product__locator" aria-hidden="true" />
      <span className="catalog-product__action" aria-hidden="true">
        {t.viewDetails}<Icon name="arrow" />
      </span>
    </button>
  );
}


function getPageButtons(currentPage, pageCount) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);

  const pages = [...new Set([
    1,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    pageCount,
  ].filter((page) => page >= 1 && page <= pageCount))].sort((a, b) => a - b);

  return pages.flatMap((page, index) => {
    const previous = pages[index - 1];
    return previous && page - previous > 1 ? [`ellipsis-${page}`, page] : [page];
  });
}


function Pager({ lang, count, currentPage, pageCount, pageSize, onPageChange }) {
  const t = getLocalePack(lang).ui;
  const [jumpPage, setJumpPage] = useState(String(currentPage));
  const pageButtons = getPageButtons(currentPage, pageCount);

  useEffect(() => {
    setJumpPage(String(currentPage));
  }, [currentPage]);

  function jump(event) {
    event.preventDefault();
    const nextPage = Math.min(pageCount, Math.max(1, Number.parseInt(jumpPage, 10) || currentPage));
    onPageChange(nextPage);
  }

  return (
    <div className="catalog-pager" aria-label={t.page}>
      <span>{t.total} <strong>{count}</strong> {t.results}</span>
      <div className="catalog-pager__buttons">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label={t.previous}
        >
          <Icon name="previous" />
        </button>
        {pageButtons.map((page) => typeof page === "number" ? (
          <button
            key={page}
            type="button"
            className={page === currentPage ? "is-active" : ""}
            aria-current={page === currentPage ? "page" : undefined}
            onClick={() => onPageChange(page)}
          >
            {page}
          </button>
        ) : (
          <span className="catalog-pager__ellipsis" key={page} aria-hidden="true">…</span>
        ))}
        <button
          type="button"
          disabled={currentPage === pageCount}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label={t.next}
        >
          <Icon name="next" />
        </button>
      </div>
      <div className="catalog-pager__meta">
        <span>
          {PAGE_CONNECTOR_LOCALES.has(lang) ? (
            <>{t.pagePrefix} <strong>{currentPage}</strong> {t.pageSuffix} {pageCount}</>
          ) : (
            <>{t.pagePrefix} <strong>{currentPage}</strong> / {pageCount} {t.pageSuffix}</>
          )}
          {" · "}{t.perPage} <strong>{pageSize}</strong> {t.productsUnit}
        </span>
        {pageCount > 1 ? (
          <form onSubmit={jump} className="catalog-pager__jump">
            <label htmlFor="catalog-page-jump">{t.goTo}</label>
            <input
              id="catalog-page-jump"
              type="number"
              min="1"
              max={pageCount}
              value={jumpPage}
              onChange={(event) => setJumpPage(event.target.value)}
              aria-label={t.enterPageNumber}
            />
            <button type="submit">{t.go}</button>
          </form>
        ) : null}
      </div>
    </div>
  );
}


function ProductDrawer({ lang, product, productIndex, categoryProducts, onClose, onMove, onOpenRelated }) {
  const t = getLocalePack(lang).ui;
  const [copied, setCopied] = useState(false);
  const related = categoryProducts.filter((item) => item.id !== product.id).slice(0, 2);
  const productLabel = productPrimaryLabel(product);
  const copyValue = product.partNo || product.catalogCode || product.model || product.id;
  const missingValue = t.notListedInCatalog || "Not listed in the source catalog";
  const sourceText = String(product.ocrText || "").trim();

  useEffect(() => {
    setCopied(false);
  }, [product.id]);

  async function copyPartNumber() {
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  const quoteSubject = encodeURIComponent(`Delift inquiry: ${productLabel}`);
  const quoteBody = encodeURIComponent(`Part No.: ${product.partNo || "-"}\nModel: ${product.model || "-"}\nSpecification: ${product.spec || "-"}\nCatalog: ${product.catalogCode || "-"}`);

  return (
    <aside className="product-drawer" aria-label={`${t.details}: ${productLabel}`}>
      <div className="product-drawer__header">
        <div><strong>{t.details}</strong><small>{t.detailSecondary}</small></div>
        <span>{productIndex + 1} / {products.length}</span>
        <button type="button" onClick={onClose} aria-label={t.close}><Icon name="close" /></button>
      </div>

      <div className="product-drawer__scroll">
        <figure className="product-drawer__cell">
          <img src={product.cellImage} alt={`${productLabel} ${product.model || "Delift"}`} />
        </figure>

        <dl className="product-specification">
          <div><dt>{t.partNo}</dt><dd>{product.partNo || missingValue}</dd></div>
          <div><dt>{t.model}</dt><dd>{product.model || missingValue}</dd></div>
          <div><dt>{t.specification}</dt><dd>{isChineseLocale(lang) ? (product.spec || missingValue) : (product.specEn || product.spec || missingValue)}</dd></div>
          <div><dt>{t.catalog}</dt><dd>{product.catalogCode || missingValue}</dd></div>
        </dl>

        {sourceText ? (
          <details className="product-source-text">
            <summary>{t.sourceCatalogText || "Source catalog text"}</summary>
            <p>{sourceText}</p>
          </details>
        ) : null}

        <div className="product-actions">
          <a href={`mailto:fpptc@yahoo.com?subject=${quoteSubject}&body=${quoteBody}`}>
            <Icon name="mail" />{t.requestQuote}
          </a>
          <button type="button" onClick={copyPartNumber} className={copied ? "is-copied" : ""}>
            <Icon name={copied ? "check" : "copy"} />{copied ? t.copied : t.copyPartNo}
          </button>
        </div>

        <div className="product-navigation">
          <button type="button" onClick={() => onMove(-1)}><Icon name="previous" />{t.previous}</button>
          <button type="button" onClick={() => onMove(1)}>{t.next}<Icon name="next" /></button>
        </div>

        <div className="compatible-brand">
          <span>{t.compatibleBrands}</span>
          <strong>{getBrand(product)}</strong>
        </div>

        <section className="related-products" aria-labelledby="related-title">
          <h3 id="related-title">{t.relatedParts}</h3>
          <div>
            {related.map((item) => (
              <button key={item.id} type="button" onClick={() => onOpenRelated(item)}>
                <img src={item.cellImage} alt={`${productPrimaryLabel(item)} ${item.model || "Delift"}`} loading="lazy" />
              </button>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}


function CatalogScreen({
  lang,
  activeCategory,
  onSelectCategory,
  query,
  onQueryChange,
  onSearch,
  suggestions,
  onPickSuggestion,
  searchStatus,
  onClearSearch,
  visibleProducts,
  selectedProduct,
  highlightedId,
  onOpenProduct,
  onCloseProduct,
  onMoveProduct,
  currentPage,
  pageCount,
  totalProducts,
  onPageChange,
}) {
  const t = getLocalePack(lang).ui;
  const showroomItems = useMemo(
    () => heroCategories.map((category) => ({ id: category.id, ...getCategoryLabels(category, lang) })),
    [lang],
  );
  const activeCategoryData = categories.find((category) => category.id === activeCategory)
    || categories[0]
    || { id: "", zh: "", en: "" };
  const activeCategoryLabels = getCategoryLabels(activeCategoryData, lang);
  const activeCategoryIndex = Math.max(0, categories.findIndex((item) => item.id === activeCategory));
  const productIndex = selectedProduct ? products.findIndex((item) => item.id === selectedProduct.id) : -1;
  const categoryProducts = selectedProduct
    ? products.filter((item) => item.category === selectedProduct.category)
    : [];

  return (
    <main className={`catalog-screen${selectedProduct ? " has-drawer" : ""}`}>
      <section className="catalog-showroom" aria-label={t.catalogHeading}>
        <ShowroomStage
          variant="catalog"
          lang={lang}
          items={showroomItems}
          onSelectCategory={onSelectCategory}
        />
        <div className="catalog-showroom__title">
          <span aria-hidden="true" />
          <div>
            <strong>{t.catalogHeading}</strong>
            <small>{t.catalogSecondary}</small>
            <em>{products.length.toLocaleString(lang)} {t.productsLabel} · {categories.length} {t.categoriesLabel}</em>
          </div>
        </div>
      </section>

      <section className="catalog-workspace" id="products">
        <CategoryRail lang={lang} activeCategory={activeCategory} onSelect={onSelectCategory} />
        <div className="catalog-main">
          <SearchToolbar
            lang={lang}
            query={query}
            onQueryChange={onQueryChange}
            onSubmit={onSearch}
            suggestions={suggestions}
            onPick={onPickSuggestion}
            status={searchStatus}
            onClear={onClearSearch}
          />

          <div className="catalog-context">
            <div>
              <strong
                lang={activeCategoryLabels.primaryLang}
                dir={activeCategoryLabels.primaryDir}
              >
                {activeCategoryLabels.primary}
              </strong>
              <small
                lang={activeCategoryLabels.secondaryLang}
                dir={activeCategoryLabels.secondaryDir}
              >
                {activeCategoryLabels.secondary}
              </small>
            </div>
            <span>{String(activeCategoryIndex + 1).padStart(2, "0")} / {String(categories.length).padStart(2, "0")}</span>
          </div>

          <div className="catalog-grid">
            {visibleProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                lang={lang}
                selected={selectedProduct?.id === product.id}
                highlighted={highlightedId === product.id}
                onOpen={onOpenProduct}
              />
            ))}
          </div>

          <Pager
            lang={lang}
            count={totalProducts}
            currentPage={currentPage}
            pageCount={pageCount}
            pageSize={PRODUCTS_PER_PAGE}
            onPageChange={onPageChange}
          />
          <CompanyTrustStrip lang={lang} className="catalog-trust-strip" />
        </div>
      </section>

      {selectedProduct ? (
        <ProductDrawer
          lang={lang}
          product={selectedProduct}
          productIndex={productIndex}
          categoryProducts={categoryProducts}
          onClose={onCloseProduct}
          onMove={onMoveProduct}
          onOpenRelated={onOpenProduct}
        />
      ) : null}
    </main>
  );
}


export function App() {
  const [lang, setLang] = useState(() => {
    const storedLanguage = localStorage.getItem("delift-language-v2");
    return storedLanguage ? getLanguage(storedLanguage).code : "zh";
  });
  const [view, setView] = useState("intro");
  const [transitioning, setTransitioning] = useState(false);
  const [activeCategory, setActiveCategory] = useState(DEFAULT_CATEGORY_ID);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [searchStatus, setSearchStatus] = useState("idle");
  const [highlightedId, setHighlightedId] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const transitionTimerRef = useRef(0);
  const pendingTargetRef = useRef("products");

  const categoryProducts = useMemo(
    () => products.filter((product) => product.category === activeCategory),
    [activeCategory],
  );

  const pageCount = Math.max(1, Math.ceil(categoryProducts.length / PRODUCTS_PER_PAGE));
  const visibleProducts = useMemo(() => {
    const firstProduct = (currentPage - 1) * PRODUCTS_PER_PAGE;
    return categoryProducts.slice(firstProduct, firstProduct + PRODUCTS_PER_PAGE);
  }, [categoryProducts, currentPage]);

  const suggestions = useMemo(() => {
    const value = normalize(deferredQuery);
    if (value.length < 2) return [];
    return products.filter((product) =>
      productSearchValues(product).some((field) => normalize(field).includes(value)),
    ).slice(0, 5);
  }, [deferredQuery]);

  useEffect(() => {
    const language = getLanguage(lang);
    localStorage.setItem("delift-language-v2", language.code);
    document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
    document.documentElement.dir = language.dir || "ltr";
  }, [lang]);

  useEffect(() => () => window.clearTimeout(transitionTimerRef.current), []);

  useEffect(() => {
    if (window.location.hash === "#products") {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`,
      );
    }

    const syncViewWithLocation = () => {
      setView(window.location.hash === "#products" ? "catalog" : "intro");
      setSelectedProduct(null);
      setTransitioning(false);
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    window.addEventListener("popstate", syncViewWithLocation);
    window.addEventListener("hashchange", syncViewWithLocation);
    return () => {
      window.removeEventListener("popstate", syncViewWithLocation);
      window.removeEventListener("hashchange", syncViewWithLocation);
    };
  }, []);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount));
  }, [pageCount]);

  function selectLanguage(nextLanguage) {
    const next = getLanguage(nextLanguage).code;
    localStorage.setItem("delift-language-v2", next);
    setLang(next);
  }

  function scrollToTarget(target) {
    window.requestAnimationFrame(() => {
      if (target === "top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      const element = target === "company"
        ? document.querySelector(".catalog-trust-strip")
        : document.getElementById("products");
      element?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function enterCatalog(target = "products") {
    pendingTargetRef.current = target;
    if (view === "catalog") {
      scrollToTarget(target);
      return;
    }
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setTransitioning(true);
    window.clearTimeout(transitionTimerRef.current);
    transitionTimerRef.current = window.setTimeout(() => {
      setView("catalog");
      setTransitioning(false);
      if (window.location.hash !== "#products") {
        window.history.pushState(null, "", "#products");
      }
      window.scrollTo({ top: 0, behavior: "auto" });
      window.setTimeout(
        () => scrollToTarget(pendingTargetRef.current),
        reducedMotion ? 0 : target === "company" ? 260 : 40,
      );
    }, reducedMotion ? 0 : 620);
  }

  function returnHome() {
    window.clearTimeout(transitionTimerRef.current);
    setView("intro");
    setSelectedProduct(null);
    setTransitioning(false);
    window.history.pushState(null, "", window.location.pathname);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function selectCategory(categoryId) {
    setActiveCategory(categoryId);
    setCurrentPage(1);
    setQuery("");
    setSearchStatus("idle");
    setSelectedProduct(null);
    if (view !== "catalog") {
      enterCatalog("products");
      return;
    }
    scrollToTarget("products");
  }

  function focusProduct(product, shouldOpen = true) {
    const productPage = Math.floor(
      products.filter((item) => item.category === product.category).findIndex((item) => item.id === product.id)
        / PRODUCTS_PER_PAGE,
    ) + 1;
    setActiveCategory(product.category);
    setCurrentPage(Math.max(1, productPage));
    setHighlightedId(product.id);
    setSearchStatus("success");
    if (shouldOpen) setSelectedProduct(product);
    window.setTimeout(() => {
      document.getElementById(`product-${product.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    window.setTimeout(() => setHighlightedId(""), 3200);
  }

  function handleSearch(event) {
    event.preventDefault();
    const value = normalize(query);
    const exactMatches = products.filter((product) =>
      [
        product.partNo,
        ...(Array.isArray(product.partAliases) ? product.partAliases : []),
        product.catalogCode,
        ...(Array.isArray(product.catalogAliases) ? product.catalogAliases : []),
      ].some((field) => normalize(field) === value),
    );
    const exact = exactMatches.find((product) => product.category === activeCategory) || exactMatches[0];
    const match = exact || suggestions[0];
    if (match) {
      focusProduct(match);
    } else {
      setSearchStatus("error");
      setSelectedProduct(null);
    }
  }

  function pickSuggestion(product) {
    setQuery(productPrimaryLabel(product));
    focusProduct(product);
  }

  function clearSearch() {
    setQuery("");
    setSearchStatus("idle");
    setHighlightedId("");
  }

  function moveProduct(direction) {
    if (!selectedProduct) return;
    const index = products.findIndex((product) => product.id === selectedProduct.id);
    const nextIndex = (index + direction + products.length) % products.length;
    const nextProduct = products[nextIndex];
    setSelectedProduct(nextProduct);
    setActiveCategory(nextProduct.category);
    const categoryIndex = products
      .filter((product) => product.category === nextProduct.category)
      .findIndex((product) => product.id === nextProduct.id);
    setCurrentPage(Math.floor(categoryIndex / PRODUCTS_PER_PAGE) + 1);
  }

  function changePage(page) {
    const nextPage = Math.min(pageCount, Math.max(1, page));
    setCurrentPage(nextPage);
    setSelectedProduct(null);
    setHighlightedId("");
    window.requestAnimationFrame(() => {
      document.querySelector(".catalog-context")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openProduct(product) {
    const categoryIndex = products
      .filter((item) => item.category === product.category)
      .findIndex((item) => item.id === product.id);
    setActiveCategory(product.category);
    setCurrentPage(Math.floor(categoryIndex / PRODUCTS_PER_PAGE) + 1);
    setSelectedProduct(product);
    setHighlightedId(product.id);
  }

  return (
    <div className={`app-shell app-shell--${view}${transitioning ? " is-transitioning" : ""}`}>
      <Header
        lang={lang}
        onSelectLanguage={selectLanguage}
        onNavigate={enterCatalog}
        onHome={returnHome}
      />

      {view === "intro" ? (
        <IntroScreen
          lang={lang}
          onExplore={() => enterCatalog("top")}
          onSelectCategory={selectCategory}
        />
      ) : (
        <CatalogScreen
          lang={lang}
          activeCategory={activeCategory}
          onSelectCategory={selectCategory}
          query={query}
          onQueryChange={(value) => {
            setQuery(value);
            setSearchStatus("idle");
          }}
          onSearch={handleSearch}
          suggestions={searchStatus === "idle" ? suggestions : []}
          onPickSuggestion={pickSuggestion}
          searchStatus={searchStatus}
          onClearSearch={clearSearch}
          visibleProducts={visibleProducts}
          selectedProduct={selectedProduct}
          highlightedId={highlightedId}
          onOpenProduct={openProduct}
          onCloseProduct={() => setSelectedProduct(null)}
          onMoveProduct={moveProduct}
          currentPage={currentPage}
          pageCount={pageCount}
          totalProducts={categoryProducts.length}
          onPageChange={changePage}
        />
      )}

      <div className="scene-transition" aria-hidden="true">
        <span />
      </div>
    </div>
  );
}
