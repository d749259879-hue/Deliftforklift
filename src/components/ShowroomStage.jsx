import {
  Component,
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import { MoveHorizontal, Rotate3D } from "lucide-react";
import { getLocalePack } from "../locales/index.js";
import "../showroom-stage.css";


const LazyForkliftWebGLStage = lazy(() => import("./ForkliftWebGLStage.jsx"));


class WebGLErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    this.props.onError?.(error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}


function supportsShowroomWebGL() {
  if (typeof window === "undefined") return false;
  return Boolean(window.WebGL2RenderingContext || window.WebGLRenderingContext);
}


export default function ShowroomStage({
  variant = "intro",
  lang = "zh",
  items = [],
  onExplore,
  onSelectCategory,
  className = "",
}) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [focused, setFocused] = useState(false);
  const [stageVisible, setStageVisible] = useState(true);
  const [webglState, setWebglState] = useState("idle");
  const [webglRequested, setWebglRequested] = useState(false);
  const stageRef = useRef(null);
  const frameRef = useRef(0);
  const focusTimerRef = useRef(0);
  const isIntro = variant !== "catalog";
  const t = getLocalePack(lang).showroom;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReducedMotion(media.matches);
    syncPreference();
    media.addEventListener?.("change", syncPreference);
    return () => {
      window.cancelAnimationFrame(frameRef.current);
      window.clearTimeout(focusTimerRef.current);
      media.removeEventListener?.("change", syncPreference);
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => setStageVisible(entry.isIntersecting && entry.intersectionRatio > 0.01),
      { threshold: [0, 0.01] },
    );
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!supportsShowroomWebGL()) {
      setWebglState("fallback");
      return undefined;
    }

    setWebglState("loading");
    setWebglRequested(true);
    return undefined;
  }, []);

  function handlePointerMove(event) {
    if (event.pointerType !== "mouse" || reducedMotion) return;
    const stage = stageRef.current;
    if (!stage) return;

    window.cancelAnimationFrame(frameRef.current);
    const { clientX, clientY } = event;
    frameRef.current = window.requestAnimationFrame(() => {
      const rect = stage.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
      stage.style.setProperty("--showroom-shift-x", `${((x - 0.5) * 10).toFixed(2)}px`);
      stage.style.setProperty("--showroom-shift-y", `${((y - 0.5) * 5).toFixed(2)}px`);
      stage.style.setProperty("--showroom-light-x", `${(x * 100).toFixed(1)}%`);
      stage.style.setProperty("--showroom-light-y", `${(y * 100).toFixed(1)}%`);
    });
  }

  function resetPointerLighting() {
    const stage = stageRef.current;
    if (!stage) return;
    stage.style.setProperty("--showroom-shift-x", "0px");
    stage.style.setProperty("--showroom-shift-y", "0px");
    stage.style.setProperty("--showroom-light-x", "50%");
    stage.style.setProperty("--showroom-light-y", "40%");
  }

  function keepFocused() {
    window.clearTimeout(focusTimerRef.current);
    setFocused(true);
  }

  function releaseFocus() {
    window.clearTimeout(focusTimerRef.current);
    focusTimerRef.current = window.setTimeout(() => setFocused(false), 320);
  }

  function handleStageLeave() {
    resetPointerLighting();
    releaseFocus();
  }

  function handleWebGLReady() {
    setWebglState("ready");
  }

  function handleWebGLError(error) {
    console.warn("Forklift WebGL showroom is unavailable.", error);
    setWebglState("fallback");
  }

  function handleForkliftActivate() {
    if (isIntro) onExplore?.();
  }

  const stageClassName = [
    "showroom-stage",
    `showroom-stage--${isIntro ? "intro" : "catalog"}`,
    focused ? "is-focused" : "",
    webglState === "ready" ? "is-webgl-ready" : "",
    className,
  ].filter(Boolean).join(" ");
  const stageLabel = isIntro ? t.stageIntro : t.stageCatalog;

  return (
    <section
      ref={stageRef}
      className={stageClassName}
      data-focused={focused ? "true" : "false"}
      data-webgl={webglState}
      aria-label={stageLabel}
      onPointerMove={handlePointerMove}
      onPointerLeave={handleStageLeave}
    >
      <div className="showroom-scene">
        {webglRequested && webglState !== "fallback" ? (
          <div className="showroom-webgl" role="presentation">
            <WebGLErrorBoundary onError={handleWebGLError}>
              <Suspense fallback={null}>
                <LazyForkliftWebGLStage
                  expanded={false}
                  items={items}
                  lang={lang}
                  variant={variant}
                  reducedMotion={reducedMotion}
                  active={stageVisible}
                  onActivate={handleForkliftActivate}
                  onBackgroundActivate={releaseFocus}
                  onError={handleWebGLError}
                  onHoverChange={(hovered) => (hovered ? keepFocused() : releaseFocus())}
                  onReady={handleWebGLReady}
                  onSelectCategory={onSelectCategory}
                />
              </Suspense>
            </WebGLErrorBoundary>
          </div>
        ) : null}

        {webglState === "loading" ? (
          <div className="showroom-loading" role="status" aria-live="polite">
            <span aria-hidden="true" />
            <small>{t.preparing}</small>
          </div>
        ) : null}

        {webglState === "fallback" ? (
          <div className="showroom-loading showroom-loading--unavailable" role="status" aria-live="polite">
            <small>
              {lang === "zh"
                ? "当前设备无法显示实时 3D 展台"
                : "Live 3D showroom is unavailable on this device"}
            </small>
            <button type="button" onClick={() => window.location.reload()}>
              重新加载 3D / Retry
            </button>
          </div>
        ) : null}

        <span className="showroom-scan" aria-hidden="true" />
        <span className="showroom-light-sweep" aria-hidden="true" />

        {isIntro ? (
          <button
            className="showroom-explore"
            type="button"
            onPointerEnter={keepFocused}
            onPointerLeave={releaseFocus}
            onClick={onExplore}
          >
            <span>{t.explore}</span>
            <small>{t.exploreSecondary}</small>
          </button>
        ) : (
          <p className="showroom-catalog-kicker" aria-hidden="true">
            <Rotate3D />
            <span>{t.liveStage}</span>
          </p>
        )}
      </div>

      {isIntro ? (
        <p className="showroom-machine-hint" aria-hidden="true">
          <MoveHorizontal />
          <span>{t.drag}</span>
          <small>{t.dragSecondary}</small>
        </p>
      ) : null}
    </section>
  );
}
