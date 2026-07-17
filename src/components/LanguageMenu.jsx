import { Check, ChevronDown, Globe2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { LANGUAGE_OPTIONS } from "../locales/base.js";


export default function LanguageMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const current = LANGUAGE_OPTIONS.find((language) => language.code === value)
    || LANGUAGE_OPTIONS[0];

  useEffect(() => {
    function closeOnOutsidePointer(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, []);

  function focusOption(index) {
    const options = optionRefs.current.filter(Boolean);
    if (!options.length) return;
    options[(index + options.length) % options.length].focus();
  }

  function openWithFocus(index) {
    setOpen(true);
    requestAnimationFrame(() => focusOption(index));
  }

  function handleMenuKeyDown(event) {
    const options = optionRefs.current.filter(Boolean);
    const activeIndex = options.indexOf(document.activeElement);

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      focusOption(activeIndex + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusOption(activeIndex < 0 ? options.length - 1 : activeIndex - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusOption(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusOption(options.length - 1);
    }
  }

  return (
    <div className="language-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        className="language-menu__trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="language-options"
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            openWithFocus(LANGUAGE_OPTIONS.findIndex((language) => language.code === current.code));
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openWithFocus(event.key === "ArrowUp" ? LANGUAGE_OPTIONS.length - 1 : 0);
          }
        }}
      >
        <Globe2 aria-hidden="true" strokeWidth={1.65} />
        <span>{current.short}</span>
        <ChevronDown aria-hidden="true" strokeWidth={1.7} />
      </button>

      {open ? (
        <div
          className="language-menu__popover"
          id="language-options"
          role="menu"
          aria-label="Language / 选择语言"
          onKeyDown={handleMenuKeyDown}
        >
          <header>
            <strong>Language</strong>
            <small>选择语言</small>
          </header>
          <div className="language-menu__options">
            {LANGUAGE_OPTIONS.map((language, index) => (
              <button
                key={language.code}
                ref={(node) => { optionRefs.current[index] = node; }}
                type="button"
                role="menuitemradio"
                aria-checked={language.code === current.code}
                lang={language.code}
                dir="ltr"
                onClick={() => {
                  onChange(language.code);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
              >
                <span className="language-menu__code">{language.short}</span>
                <span className="language-menu__label" dir={language.dir || "ltr"}>{language.label}</span>
                {language.code === current.code ? <Check aria-hidden="true" strokeWidth={2} /> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
