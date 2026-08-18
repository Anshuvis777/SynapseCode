import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#060608] p-6">
          <div className="max-w-md w-full text-center space-y-6">

            {/* Icon with glow */}
            <div className="relative mx-auto w-fit">
              <div className="absolute inset-0 rounded-full bg-red-500/20 blur-2xl scale-150" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-red-950/40 border border-red-900/30 mx-auto shadow-depth-2">
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </div>

            {/* Title & description */}
            <div className="space-y-2">
              <h1 className="text-xl font-bold tracking-tight text-zinc-100">
                Something went wrong
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
                An unexpected error occurred in the application. You can try to recover or reload the page.
              </p>
            </div>

            {/* Error details card */}
            {this.state.error && (
              <div className="glass-card-accent p-4 text-left space-y-2">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  Error Details
                </p>
                <code className="block text-xs text-red-300 font-mono leading-relaxed bg-red-950/20 p-3 rounded-lg border border-red-900/20 max-h-32 overflow-auto">
                  {this.state.error.message}
                </code>
                {this.state.errorInfo?.componentStack && (
                  <details className="text-[10px] text-zinc-500">
                    <summary className="cursor-pointer hover:text-zinc-300 transition-colors font-semibold py-1">
                      Component Stack Trace
                    </summary>
                    <pre className="mt-2 text-[9px] font-mono text-zinc-600 bg-zinc-950/80 p-2 rounded overflow-auto max-h-40 leading-normal">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-zinc-100 bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm shadow-blue-900/20 transition-all active:scale-[0.98]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Try Again
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-zinc-300 bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/50 rounded-lg transition-all active:scale-[0.98]"
              >
                <Home className="w-3.5 h-3.5" />
                Go to Dashboard
              </button>
            </div>

            {/* Subtle footer note */}
            <p className="text-[10px] text-zinc-600 pt-2">
              If this problem persists, try clearing your browser cache or contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
