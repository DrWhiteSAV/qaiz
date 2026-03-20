import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import WebApp from '@twa-dev/sdk';
import App from './App.tsx';
import './index.css';

// Initialize Telegram WebApp
WebApp.ready();
WebApp.expand();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
