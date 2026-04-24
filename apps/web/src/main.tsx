import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { App } from './App';
import './styles/globals.css';

// Registro global del plugin oficial de React. Permite que `useGSAP` se
// integre con el ciclo de vida de los componentes y se limpie solo.
gsap.registerPlugin(useGSAP);

const container = document.getElementById('root');
if (!container) {
  throw new Error('Contenedor #root no encontrado en index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
