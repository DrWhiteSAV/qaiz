import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
          <h2 className="text-3xl font-bold text-primary">Что-то пошло не так</h2>
          <p className="mt-4 text-foreground/60">
            {this.state.error?.message || 'Произошла непредвиденная ошибка.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-8 rounded-full bg-primary px-8 py-3 font-bold text-background transition-transform hover:scale-105"
          >
            Перезагрузить страницу
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
