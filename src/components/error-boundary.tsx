"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onReset?: () => void;
  returnHref: string;
  returnLabel?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="bg-danger-soft border-danger/20 flex min-h-[40vh] flex-col items-center justify-center rounded-lg border p-8 text-center">
          <AlertCircle className="text-danger mb-4 size-12" />
          <h2 className="text-heading-md text-danger mb-2">Something went wrong</h2>
          <p className="text-body-md text-text-secondary mb-6 max-w-md">
            An error occurred while loading this content. You can try again or return to a safe page.
          </p>
          <div className="flex gap-3">
            <Button onClick={this.handleReset} variant="outline">
              Try Again
            </Button>
            <Button onClick={() => { window.location.href = this.props.returnHref; }}>
              {this.props.returnLabel ?? "Return to Dashboard"}
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
