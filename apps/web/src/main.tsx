import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { App } from './App';
import './styles/globals.css';

// Registro global del plugin oficial de React. Permite que `useGSAP` se
// integre con el ciclo de vida de los componentes y se limpie solo.
gsap.registerPlugin(useGSAP);

/*
 * Diagnóstico de re-renders en desarrollo (issue #129).
 *
 * `react-scan` se carga sólo cuando Vite levanta en modo dev y queda
 * inerte en el bundle de producción gracias al guard de `import.meta.env`.
 * El overlay no se muestra por defecto: con `showToolbar: false` deja
 * los marcadores discretos junto al árbol y se activa pulsando `Ctrl+\\`
 * (combinación documentada en CONTRIBUTING) cuando hace falta auditar.
 */
if (import.meta.env.DEV) {
  void import('react-scan').then(({ scan }) => {
    scan({ enabled: true, showToolbar: false, log: false });
  });
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('Contenedor #root no encontrado en index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
