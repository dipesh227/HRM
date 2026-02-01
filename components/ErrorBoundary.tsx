import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  // Initialize state as a class property to satisfy strict typing
  public state: State = { hasError: false };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-lg w-full border border-slate-200">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-6 mx-auto">
                <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 mb-2 text-center">Something went wrong</h1>
            <p className="text-slate-500 mb-6 text-center">The application encountered an unexpected error.</p>
            
            <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 mb-6 overflow-hidden">
                <p className="text-xs font-mono text-slate-700 break-words">
                    {this.state.error?.message || "Unknown Error"}
                </p>
            </div>

            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-slate-900 text-white py-3 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 font-medium shadow-lg shadow-slate-200"
            >
              <RefreshCw className="w-4 h-4" /> Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}