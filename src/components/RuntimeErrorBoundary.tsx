import { Component, type ErrorInfo, type ReactNode } from 'react';

interface RuntimeErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode;
}

interface RuntimeErrorBoundaryState {
  hasError: boolean;
}

export class RuntimeErrorBoundary extends Component<RuntimeErrorBoundaryProps, RuntimeErrorBoundaryState> {
  state: RuntimeErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): RuntimeErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('The 3D portfolio book failed to render. Showing the accessible fallback gallery.', error, info);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
