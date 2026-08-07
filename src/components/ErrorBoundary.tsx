import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  declare props: Props;

  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App Uncaught Error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#14110f] text-stone-200 flex items-center justify-center p-4">
          <div className="bg-[#1e1713] border border-amber-900/50 rounded-2xl p-6 max-w-md text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 bg-red-950/60 border border-red-800/40 rounded-full flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-amber-100 font-serif">Anwendung kurz unterbrochen</h2>
            <p className="text-xs text-stone-400 leading-relaxed">
              Ein unerwarteter Anzeige-Fehler ist aufgetreten. Ihre Münzsammlung und Daten sind sicher gespeichert.
            </p>
            {this.state.error?.message && (
              <div className="bg-[#120d0b] border border-stone-800 p-2.5 rounded-lg text-[11px] font-mono text-stone-400 text-left overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReload}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition-colors shadow-lg"
            >
              <RefreshCw className="w-4 h-4" />
              App neu laden
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
