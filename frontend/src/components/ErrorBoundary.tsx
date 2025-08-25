"use client";

import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  title?: string;
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("ErrorBoundary caught:", error);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-5 rounded-xl border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 space-y-2">
          {/* Title */}
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="font-semibold">
              {this.props.title ?? "Component Error"}
            </h3>
          </div>

          {/* Error Message */}
          {this.state.error && (
            <p className="text-xs text-red-600 dark:text-red-400 truncate">
              {this.state.error.message}
            </p>
          )}

          {/* Actions */}
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-full bg-red-600 text-white hover:bg-red-700 transition"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
