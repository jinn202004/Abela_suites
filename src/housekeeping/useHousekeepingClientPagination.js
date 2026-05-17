import { useState, useEffect, useMemo } from "react";

/**
 * Client-side table pagination for housekeeping views (no API or DB changes).
 * Slices an in-memory list after fetch + filter.
 */
export function useHousekeepingClientPagination(items, resetDeps = []) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const list = Array.isArray(items) ? items : [];
  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize) || 1);
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pageStart = (currentPage - 1) * pageSize;

  const pagedItems = useMemo(
    () => list.slice(pageStart, pageStart + pageSize),
    [list, pageStart, pageSize],
  );

  const rangeFrom = totalItems === 0 ? 0 : pageStart + 1;
  const rangeTo = totalItems === 0 ? 0 : pageStart + pagedItems.length;

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset when filters/tabs change
  }, resetDeps);

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  return {
    page: currentPage,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    totalItems,
    rangeFrom,
    rangeTo,
    pagedItems,
  };
}
