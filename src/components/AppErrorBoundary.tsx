import { Component, type ErrorInfo, type ReactNode } from "react";
import { translations } from "../localization/messages";

interface AppErrorBoundaryProps {
  children: ReactNode;
  locale?: "ru" | "en";
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

function detectLocale(): "ru" | "en" {
  if (typeof navigator !== "undefined" && navigator.language.toLowerCase().startsWith("en")) {
    return "en";
  }
  return "ru";
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unhandled application error", error, info);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const copy = translations[this.props.locale ?? detectLocale()].errors;

    return (
      <div className="standalone-screen app-crash" role="alert">
        <span className="brand-mark" aria-hidden="true">SD</span>
        <h1>{copy.crashTitle}</h1>
        <p>{copy.crashBody}</p>
        <div className="standalone-screen__actions">
          <button className="button button--primary" onClick={this.handleReload} type="button">
            {copy.crashReload}
          </button>
        </div>
      </div>
    );
  }
}
