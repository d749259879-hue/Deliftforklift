import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles.css";

const PRELOAD_RETRY_KEY = "delift-preload-retry-v1";

window.addEventListener("vite:preloadError", () => {
  try {
    if (sessionStorage.getItem(PRELOAD_RETRY_KEY) === "1") return;
    sessionStorage.setItem(PRELOAD_RETRY_KEY, "1");
    window.location.reload();
  } catch {
    // The visible error boundary remains available when storage is blocked.
  }
});

window.setTimeout(() => {
  try {
    sessionStorage.removeItem(PRELOAD_RETRY_KEY);
  } catch {
    // Ignore storage restrictions.
  }
}, 10000);

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("Delift application render failed.", error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="app-fatal-error" role="alert">
          <img src="/assets/delift-logo.png?v=20260718-1" alt="Delift" />
          <h1>页面暂时无法显示</h1>
          <p>Please reload the page to continue.</p>
          <button type="button" onClick={() => window.location.reload()}>重新加载 / Reload</button>
        </main>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
