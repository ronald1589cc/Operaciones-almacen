import { createIcons, icons } from 'lucide';

let timeoutId = null;

export function initAutoIcons() {
  const render = () => {
    createIcons({ icons });
  };

  // Render inicial al cargar la página
  render();

  // Escuchar cambios en el DOM sin crear bucles infinitos
  const observer = new MutationObserver((mutations) => {
    const hasNewNodes = mutations.some((m) => m.addedNodes.length > 0);
    
    if (hasNewNodes) {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        render();
      }, 50); // Espera 50ms a que termine de mutar el DOM
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}