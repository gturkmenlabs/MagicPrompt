import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './styles.css';
import NeoMagicApp from './neomagic/NeoMagicApp';

document.documentElement.lang = 'tr';
document.documentElement.dataset.theme = 'dark';
(globalThis as { language?: 'en' | 'tr' }).language = 'tr';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error?: Error; errorInfo?: React.ErrorInfo }> {
  state = { hasError: false, error: undefined as Error | undefined, errorInfo: undefined as React.ErrorInfo | undefined };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#0b0f14', color: '#f3f6fb', padding: '32px 20px', fontFamily: '"Instrument Sans", system-ui, sans-serif' }}>
          <div style={{ maxWidth: '760px', margin: '0 auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '24px', background: 'linear-gradient(180deg, rgba(18, 24, 33, 0.94), rgba(14, 18, 25, 0.98))', boxShadow: '0 24px 60px rgba(3, 8, 16, 0.42)', padding: '28px' }}>
            <p style={{ margin: '0 0 10px 0', fontFamily: '"IBM Plex Mono", monospace', fontSize: '11px', fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#5b8cff' }}>NeoMagic</p>
            <h1 style={{ fontSize: '28px', lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 12px 0' }}>Something went wrong while loading the app</h1>
            <p style={{ color: '#c2cbd8', fontSize: '14px', lineHeight: 1.65, margin: 0 }}>{this.state.error?.message ?? 'Unknown error'}</p>
          <pre style={{ marginTop: '20px', color: '#d46a6a', fontSize: '12px', whiteSpace: 'pre-wrap', maxHeight: '300px', overflow: 'auto', background: '#121821', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
            {this.state.error?.stack ?? ''}
          </pre>
          <pre style={{ marginTop: '12px', color: '#d8a657', fontSize: '12px', whiteSpace: 'pre-wrap', maxHeight: '200px', overflow: 'auto', background: '#121821', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
            {this.state.errorInfo?.componentStack ?? ''}
          </pre>
          <p style={{ marginTop: '16px', color: '#8c97a8', fontSize: '12px' }}>Check the browser console and restart the dev server with `npm run dev` if needed.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <NeoMagicApp />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
