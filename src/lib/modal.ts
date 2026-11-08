'use client';
/**
 * What every aria-modal overlay (search, bag drawer, image viewer) needs while it is open:
 * a scroll hold that is released on close *and* on unmount, Tab kept inside the dialog,
 * Escape to close, and focus handed back to whatever opened it.
 */
import { useEffect, useRef, type RefObject } from 'react';
import { holdScroll } from './clock';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

const focusables = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden',
  );

/** Open dialogs, innermost last. Only the top one handles Tab, focus and Escape. */
const stack: symbol[] = [];

/*
 * iOS raises the keyboard only for a focus() made during the tap itself, and the search
 * input mounts later (lazy chunk, then an effect). Focusing a hidden input during the tap
 * opens the keyboard; the real input then takes focus, and the keyboard, when it mounts.
 */
let proxy: HTMLInputElement | null = null;
let proxyOpener: Element | null = null;

export function primeKeyboard() {
  if (typeof window === 'undefined' || !window.matchMedia('(pointer: coarse)').matches) return;
  if (!proxy) {
    const input = document.createElement('input');
    input.type = 'text';
    input.tabIndex = -1;
    input.setAttribute('aria-hidden', 'true');
    // 16px so iOS doesn't zoom; fixed so focusing it never scrolls the page.
    input.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;border:0;padding:0;font-size:16px;pointer-events:none';
    input.addEventListener('blur', () => input.remove());
    proxy = input;
  }
  if (document.activeElement !== proxy) proxyOpener = document.activeElement;
  document.body.appendChild(proxy);
  proxy.focus({ preventScroll: true });
  // Never strand the keyboard on the proxy if the overlay doesn't take focus.
  const p = proxy;
  window.setTimeout(() => document.activeElement === p && p.blur(), 3000);
}

export function useModal(open: boolean, dialog: RefObject<HTMLElement | null>, onClose: () => void) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    if (!open) return;
    const el = dialog.current;
    const id = Symbol('modal');
    stack.push(id);
    const active = document.activeElement;
    const opener = active && active === proxy ? proxyOpener : active;
    const release = holdScroll();
    const isTop = () => stack[stack.length - 1] === id;

    const onKey = (e: KeyboardEvent) => {
      if (!el || !isTop()) return;
      if (e.key === 'Escape') {
        close.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables(el);
      const at = document.activeElement;
      if (!items.length) {
        e.preventDefault();
        el.focus({ preventScroll: true });
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (!at || !el.contains(at)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus({ preventScroll: true });
      } else if (e.shiftKey && (at === first || at === el)) {
        e.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!e.shiftKey && at === last) {
        e.preventDefault();
        first.focus({ preventScroll: true });
      }
    };
    // Focus that lands outside (a click on the page behind, a screen-reader jump) comes back.
    const onFocusIn = (e: FocusEvent) => {
      const target = e.target as Node | null;
      if (!el || !isTop() || !target || target === proxy || el.contains(target)) return;
      (focusables(el)[0] ?? el).focus({ preventScroll: true });
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', onFocusIn);

    return () => {
      stack.splice(stack.indexOf(id), 1);
      release();
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', onFocusIn);
      const now = document.activeElement;
      const focusWasInside = !now || now === document.body || (el && el.contains(now));
      if (opener instanceof HTMLElement && opener.isConnected && opener !== document.body && focusWasInside) {
        opener.focus({ preventScroll: true });
      }
    };
  }, [open, dialog]);
}
