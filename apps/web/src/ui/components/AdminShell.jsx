import { useEffect, useRef } from 'react';
import { createApp } from '../../admin-shell/app.js';
import '../../admin-shell/style.css';

/**
 * AdminShell - Wrapper React para aplicação vanilla de administração
 * 
 * Executa o app vanilla de admin (criado em admin-shell/) dentro de um
 * contêiner React, mantendo isolamento e permitindo rota /admin no SPA.
 */
export function AdminShell() {
  const containerRef = useRef(null);
  const appInstanceRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Cria instância da app vanilla
      const app = createApp();
      appInstanceRef.current = app;

      // Monta no contêiner React
      app.mount(containerRef.current);

      // Limpa ao desmontar
      return () => {
        app.unmount?.();
        appInstanceRef.current = null;
      };
    } catch (error) {
      console.error('[AdminShell] Erro ao montar admin app:', error);
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div class="flex items-center justify-center h-screen bg-red-900/20 border-2 border-red-600">
            <div class="text-center">
              <h2 class="text-white text-xl font-bold">Erro ao carregar Admin</h2>
              <p class="text-red-300 text-sm mt-2">${error.message}</p>
            </div>
          </div>
        `;
      }
    }
  }, []);

  return (
    <div
      ref={containerRef}
      id="admin-root"
      className="w-full min-h-screen"
    />
  );
}

export default AdminShell;
