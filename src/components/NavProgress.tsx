'use client';

import {usePathname} from 'next/navigation';
import {useEffect, useRef, useState} from 'react';

export default function NavProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearTimers() {
    if (tick.current) clearInterval(tick.current);
    if (hide.current) clearTimeout(hide.current);
    tick.current = null;
    hide.current = null;
  }

  function start() {
    clearTimers();
    setVisible(true);
    setWidth(8);
    tick.current = setInterval(() => {
      setWidth((w) => (w < 90 ? w + Math.max(0.5, (90 - w) * 0.08) : w));
    }, 200);
  }

  function finish() {
    clearTimers();
    setWidth(100);
    hide.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 280);
  }

  // Complete the bar once the route actually changed.
  useEffect(() => {
    setVisible((v) => {
      if (v) finish();
      return v;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Start the bar on any in-app link click.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const a = el?.closest?.('a');
      if (!a) return;
      const target = a.getAttribute('target');
      if (target && target !== '_self') return;
      const href = a.getAttribute('href') || '';
      if (!href.startsWith('/') || href.startsWith('//') || href.startsWith('#')) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    }
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-50 h-0.5 pointer-events-none">
      <div
        className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.7)] transition-[width] duration-200 ease-out"
        style={{width: `${width}%`}}
      />
    </div>
  );
}
