import { useEffect } from 'react';

/**
 * Bloquea el scroll del body mientras `isOpen` es true.
 * Compatible con iOS Safari.
 */
export function useModalLock(isOpen) {
  useEffect(() => {
    if (!isOpen) return;
    const scrollY = window.scrollY;
    document.body.classList.add('modal-open');
    document.documentElement.classList.add('modal-open');
    // iOS: fijar el body en la posición actual para evitar rebote
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.classList.remove('modal-open');
      document.documentElement.classList.remove('modal-open');
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      // Restaurar posición de scroll
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);
}
