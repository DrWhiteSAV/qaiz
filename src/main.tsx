import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) {
  document.body.innerHTML = '<div style="color:red;padding:20px">ROOT ELEMENT NOT FOUND</div>';
} else {
  try {
    createRoot(rootEl).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (err) {
    console.error('React render failed:', err);
    rootEl.innerHTML = `<div style="color:white;background:#020617;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:sans-serif;padding:20px;text-align:center">
      <div>
        <h2 style="color:#83c42e;font-size:24px;margin-bottom:12px">Ошибка запуска</h2>
        <p style="opacity:0.7;margin-bottom:16px">${String(err)}</p>
        <button onclick="location.reload()" style="background:#83c42e;color:#020617;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;font-weight:bold">Перезагрузить</button>
      </div>
    </div>`;
  }
}
