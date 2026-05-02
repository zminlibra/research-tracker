"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface SearchFiltersProps {
  defaultYearFrom?: string;
  defaultYearTo?: string;
  defaultAuthor?: string;
}

export default function SearchFilters({
  defaultYearFrom = "",
  defaultYearTo = "",
  defaultAuthor = "",
}: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [yearFrom, setYearFrom] = useState(defaultYearFrom);
  const [yearTo, setYearTo] = useState(defaultYearTo);
  const [author, setAuthor] = useState(defaultAuthor);

  function buildFilterUrl(overrides: Record<string, string> = {}) {
    const params = new URLSearchParams();
    const q = searchParams.get("q") || "";
    if (q) params.set("q", q);
    const page = overrides.page ?? "1";
    if (page !== "1") params.set("page", page);
    const sort = searchParams.get("sort") || "relevance";
    if (sort !== "relevance") params.set("sort", sort);
    const source = searchParams.get("source") || "all";
    if (source !== "all") params.set("source", source);
    if (yearFrom) params.set("yearFrom", yearFrom);
    if (yearTo) params.set("yearTo", yearTo);
    if (author) params.set("author", author);
    Object.entries(overrides).forEach(([k, v]) => {
      if (v && !["yearFrom", "yearTo", "author"].includes(k)) {
        params.set(k, v);
      }
    });
    return `/search?${params.toString()}`;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(buildFilterUrl());
  }

  function handleAuthorKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const v = (e.target as HTMLInputElement).value;
      setAuthor(v);
      const params = new URLSearchParams();
      const q = searchParams.get("q") || "";
      if (q) params.set("q", q);
      params.set("page", "1");
      params.set("author", v);
      const sort = searchParams.get("sort") || "relevance";
      if (sort !== "relevance") params.set("sort", sort);
      const source = searchParams.get("source") || "all";
      if (source !== "all") params.set("source", source);
      if (yearFrom) params.set("yearFrom", yearFrom);
      if (yearTo) params.set("yearTo", yearTo);
      router.push(`/search?${params.toString()}`);
    }
  }

  const hasFilters = yearFrom || yearTo || author;

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-2 sm:grid-cols-4 gap-3"
    >
      <div className="space-y-1">
        <Label htmlFor="yearFrom" className="text-xs text-muted-foreground">
          起始年份
        </Label>
        <Input
          id="yearFrom"
          type="number"
          placeholder="如 2020"
          value={yearFrom}
          onChange={(e) => setYearFrom(e.target.value)}
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="yearTo" className="text-xs text-muted-foreground">
          截止年份
        </Label>
        <Input
          id="yearTo"
          type="number"
          placeholder="如 2025"
          value={yearTo}
          onChange={(e) => setYearTo(e.target.value)}
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="author" className="text-xs text-muted-foreground">
          作者名
        </Label>
        <Input
          id="author"
          type="text"
          placeholder="如 Smith"
          defaultValue={defaultAuthor}
          onChange={(e) => setAuthor(e.target.value)}
          onKeyDown={handleAuthorKeyDown}
          className="h-8 text-sm"
        />
      </div>
      <div className="flex items-end gap-2">
        <Button type="submit" size="sm" className="h-8 text-sm flex-1">
          应用筛选
        </Button>
        {hasFilters && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-destructive px-2"
            onClick={() => {
              setYearFrom("");
              setYearTo("");
              setAuthor("");
              const params = new URLSearchParams();
              const q = searchParams.get("q") || "";
              if (q) params.set("q", q);
              params.set("page", "1");
              const sort = searchParams.get("sort") || "relevance";
              if (sort !== "relevance") params.set("sort", sort);
              const source = searchParams.get("source") || "all";
              if (source !== "all") params.set("source", source);
              router.push(`/search?${params.toString()}`);
            }}
          >
            清除
          </Button>
        )}
      </div>
    </form>
  );
}
