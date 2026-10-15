"use client";
import { useState } from "react";

export function usePagination<T>(items: T[], pageSize = 10) {
  const [requestedPage, setPage] = useState(1);
  const page = Math.min(
    requestedPage,
    Math.max(1, Math.ceil(items.length / pageSize)),
  );
  return {
    page,
    setPage,
    pageSize,
    rows: items.slice((page - 1) * pageSize, page * pageSize),
    resetPage: () => setPage(1),
  };
}
