"use client";

import { useCallback, useMemo, useState } from "react";
const EMPTY_SELECTION = new Set<string>();

export function useTableSelection(visibleIds: readonly string[], scopeKey: string) {
  const [selection, setSelection] = useState<{ scopeKey: string; ids: Set<string> }>(() => ({
    scopeKey,
    ids: new Set(),
  }));
  const selectedIds = selection.scopeKey === scopeKey ? selection.ids : EMPTY_SELECTION;

  const visibleIdSet = useMemo(() => new Set(visibleIds), [visibleIds]);
  const selectedVisibleCount = useMemo(
    () => [...selectedIds].filter((id) => visibleIdSet.has(id)).length,
    [selectedIds, visibleIdSet]
  );
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length;
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected;

  const toggleOne = useCallback(
    (id: string, checked: boolean) => {
      setSelection((previous) => {
        const next = previous.scopeKey === scopeKey ? new Set(previous.ids) : new Set<string>();
        if (checked) next.add(id);
        else next.delete(id);
        return { scopeKey, ids: next };
      });
    },
    [scopeKey]
  );

  const toggleAllVisible = useCallback(
    (checked: boolean) => {
      setSelection({ scopeKey, ids: checked ? new Set(visibleIds) : new Set() });
    },
    [scopeKey, visibleIds]
  );

  const clearSelection = useCallback(() => setSelection({ scopeKey, ids: new Set() }), [scopeKey]);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    allVisibleSelected,
    someVisibleSelected,
    toggleOne,
    toggleAllVisible,
    clearSelection,
  };
}
