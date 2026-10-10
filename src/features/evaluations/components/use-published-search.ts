"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The draft a Published toolbar's search box edits, committed to the list on a
 * debounce so typing does not write a history entry per keystroke.
 *
 * The commit always runs through the newest callback, so a period, course or
 * target facet chosen mid-debounce is kept instead of being overwritten by the
 * filters snapshot taken when typing started. A query that arrives from
 * elsewhere (a browser back navigation, a server render) replaces the draft.
 */
export function usePublishedSearch(
  query: string,
  commit: (query: string, navigation: "push" | "replace") => void,
  delay = 300
): { value: string; onChange: (value: string) => void } {
  const [draft, setDraft] = useState(query);
  const [committedQuery, setCommittedQuery] = useState(query);
  const timer = useRef<number | null>(null);
  const latestCommit = useRef(commit);

  if (committedQuery !== query) {
    setCommittedQuery(query);
    setDraft(query);
  }

  useEffect(() => {
    latestCommit.current = commit;
  });

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    []
  );

  const onChange = useCallback(
    (value: string) => {
      setDraft(value);
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        timer.current = null;
        latestCommit.current(value, "replace");
      }, delay);
    },
    [delay]
  );

  return { value: draft, onChange };
}
