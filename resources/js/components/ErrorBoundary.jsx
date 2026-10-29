import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import Button from './Button';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[300px] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4">
            <AlertTriangle className="w-6 h-6 stroke-[1.5]" />
          </div>
          <h2 className="text-base font-semibold text-gray-900 mb-1">Something went wrong</h2>
          <p className="text-xs text-gray-500 max-w-md mb-4">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={RotateCcw}
              onClick={this.handleReset}
            >
              Reload Page
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { window.location.href = '/'; }}
            >
              Go to Gallery
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
