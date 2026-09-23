"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Structural types for the Navigation API. TypeScript 5.9's `lib.dom` ships
 * `NavigationHistoryEntry` but not `Navigation` or `NavigateEvent`, so
 * `window.navigation` is untyped. Only the members this guard reads are
 * declared, kept local to avoid conflicting with a future lib update.
 *
 * Reference: https://html.spec.whatwg.org/multipage/nav-history-apis.html
 */
type NavigateEvent = Event & {
  readonly destination: { readonly url: string; readonly sameDocument: boolean | null };
  readonly hashChange: boolean;
};

type NavigationTarget = EventTarget & {
  addEventListener(type: "navigate", listener: (event: NavigateEvent) => void): void;
  removeEventListener(type: "navigate", listener: (event: NavigateEvent) => void): void;
};

function getNavigationTarget(): NavigationTarget | null {
  const navigation: unknown = Reflect.get(window, "navigation");
  if (typeof navigation !== "object" || navigation === null) return null;
  return navigation as NavigationTarget;
}

type UnsavedChangesGuardOptions = {
  /** Whether unsaved work exists. The guard binds only while this is true. */
  isDirty: boolean;
  /**
   * Asks the user to confirm leaving, with the destination when the departure
   * was a link (`null` for a history traversal). The view renders its own
   * confirmation; nothing navigates until it calls `allowDeparture`.
   */
  onRequestLeave: (href: string | null) => void;
};

type UnsavedChangesGuard = {
  /**
   * Pre-approves the next departure so the guard lets it through. Call it
   * immediately before navigating away after the user has confirmed.
   */
  allowDeparture: () => void;
  /** Whether Back must cross a held same-URL entry on this browser. */
  hasHeldHistoryEntry: () => boolean;
};

/**
 * Holds a view while unsaved changes exist, and routes every in-app departure
 * through `onRequestLeave` so the app can show its own confirmation instead of
 * the browser's native prompt.
 *
 * Two mechanisms, because the two departure kinds differ:
 *
 * - In-app links are cancelled on the capture phase, before the router sees the
 *   click. The listener belongs to the app lifetime, so no transition can
 *   detach it mid-flight.
 * - Back/Forward use the Navigation API's `navigate` event, which is cancelable
 *   and fires before `popstate`. `popstate` cannot carry this: Next.js binds its
 *   own `popstate` handler at bootstrap, ahead of any effect, so on a Back
 *   traversal the router re-renders the previous route and React detaches the
 *   guard before it can prompt — the draft was discarded with no confirmation.
 *   Cancelling `navigate` stops the traversal outright, so the view stays
 *   mounted with its draft intact.
 *
 * Refresh and browser close keep the platform's native warning, because
 * `beforeunload` is the only signal a page receives there and its prompt cannot
 * be restyled.
 *
 * Without the Navigation API, a same-URL history entry absorbs a one-step
 * Back traversal before the router can leave this page. The confirmation then
 * either keeps the editor or crosses both entries after approval.
 */
export function useUnsavedChangesGuard({
  isDirty,
  onRequestLeave,
}: UnsavedChangesGuardOptions): UnsavedChangesGuard {
  // Kept in a ref so rebinding never depends on a caller that re-creates its
  // callback every render. Synced in an effect because render must not write refs.
  const requestLeave = useRef(onRequestLeave);
  useEffect(() => {
    requestLeave.current = onRequestLeave;
  }, [onRequestLeave]);

  const departureApproved = useRef(false);
  const heldEntry = useRef(false);

  const allowDeparture = useCallback(() => {
    departureApproved.current = true;
  }, []);
  const hasHeldHistoryEntry = useCallback(
    () => getNavigationTarget() === null && heldEntry.current,
    []
  );

  useEffect(() => {
    const navigation = getNavigationTarget();
    if (!isDirty && !heldEntry.current) return;
    if (isDirty) departureApproved.current = false;

    /** Modifier-clicks, downloads, and off-site links stay with the browser. */
    const leavesDocument = (event: MouseEvent, anchor: HTMLAnchorElement) => {
      const hasModifier = [event.metaKey, event.ctrlKey, event.shiftKey, event.altKey].some(
        Boolean
      );
      return (
        hasModifier ||
        Boolean(anchor.target) ||
        anchor.hasAttribute("download") ||
        anchor.origin !== window.location.origin
      );
    };

    const interceptLinkClick = (event: MouseEvent) => {
      if (departureApproved.current || event.defaultPrevented || event.button !== 0) return;
      const anchor = (event.target as Element | null)?.closest?.(
        "a[href]"
      ) as HTMLAnchorElement | null;
      if (!anchor || leavesDocument(event, anchor)) return;
      // Already there: nothing to discard, so let it through untouched.
      if (anchor.href === window.location.href) return;

      event.preventDefault();
      event.stopPropagation();
      requestLeave.current(`${anchor.pathname}${anchor.search}${anchor.hash}`);
    };

    // Navigation API support is checked once for this effect's listener set.
    const cancelTraversal = (event: NavigateEvent) => {
      if (departureApproved.current) return;
      // Cross-document destinations have already left this document; only the
      // browser's own beforeunload warning can speak for them.
      if (!event.cancelable || event.hashChange || event.destination.sameDocument === false) return;

      event.preventDefault();
      requestLeave.current(null);
    };

    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (departureApproved.current) return;
      event.preventDefault();
      event.returnValue = true;
    };
    // popstate cannot be cancelled. A same-URL entry keeps the first Back
    // traversal on this route, so Next sees the editor rather than its parent.
    if (!navigation?.addEventListener && isDirty && !heldEntry.current) {
      window.history.pushState(window.history.state, "", window.location.href);
      heldEntry.current = true;
    }
    const handlePopstate = () => {
      if (departureApproved.current) return;
      if (!isDirty) {
        if (!heldEntry.current) return;
        heldEntry.current = false;
        window.history.go(-1);
        return;
      }
      window.history.pushState(window.history.state, "", window.location.href);
      heldEntry.current = true;
      requestLeave.current(null);
    };

    if (isDirty) {
      document.addEventListener("click", interceptLinkClick, true);
      window.addEventListener("beforeunload", warnBeforeUnload);
    }
    if (navigation?.addEventListener) {
      if (isDirty) navigation.addEventListener("navigate", cancelTraversal);
    } else if (heldEntry.current) {
      window.addEventListener("popstate", handlePopstate);
    }

    return () => {
      document.removeEventListener("click", interceptLinkClick, true);
      window.removeEventListener("beforeunload", warnBeforeUnload);
      if (navigation?.addEventListener) {
        navigation.removeEventListener("navigate", cancelTraversal);
      } else {
        window.removeEventListener("popstate", handlePopstate);
      }
    };
  }, [isDirty]);

  return { allowDeparture, hasHeldHistoryEntry };
}
