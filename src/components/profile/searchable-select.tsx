"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { touchInput } from "@/components/quotes/ui";

export interface SearchableSelectOption {
  value: string;
  label: string;
  hint?: string;
}

interface SearchableSelectProps {
  id: string;
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  maxResults?: number;
  emptyQueryMaxResults?: number;
}

export function SearchableSelect({
  id,
  options,
  value,
  onChange,
  placeholder = "Search...",
  disabled = false,
  required = false,
  maxResults = 60,
  emptyQueryMaxResults,
}: SearchableSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matches = normalizedQuery
      ? options.filter(
          (option) =>
            option.label.toLowerCase().includes(normalizedQuery) ||
            option.value.toLowerCase().includes(normalizedQuery) ||
            option.hint?.toLowerCase().includes(normalizedQuery)
        )
      : options;

    const limit = normalizedQuery
      ? maxResults
      : (emptyQueryMaxResults ?? maxResults);

    return matches.slice(0, limit);
  }, [emptyQueryMaxResults, maxResults, options, query]);

  const isTruncated = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matches = normalizedQuery
      ? options.filter(
          (option) =>
            option.label.toLowerCase().includes(normalizedQuery) ||
            option.value.toLowerCase().includes(normalizedQuery) ||
            option.hint?.toLowerCase().includes(normalizedQuery)
        )
      : options;

    const limit = normalizedQuery
      ? maxResults
      : (emptyQueryMaxResults ?? maxResults);

    return matches.length > limit;
  }, [emptyQueryMaxResults, maxResults, options, query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={`${id}-listbox`}
        value={open ? query : (selectedOption?.label ?? "")}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        required={required && !value}
        className={`${touchInput} mt-1.5`}
      />

      {open && !disabled && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-white/10 bg-navy shadow-lg"
        >
          {filteredOptions.length === 0 ? (
            <li className="px-4 py-2.5 text-sm text-slate-400">No matches</li>
          ) : (
            filteredOptions.map((option) => {
              const isSelected = option.value === value;
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                >
                  <button
                    type="button"
                    className={`w-full px-4 py-2.5 text-left text-base text-white transition hover:bg-accent/20 ${
                      isSelected ? "bg-accent/15 text-white" : ""
                    }`}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })
          )}
          {isTruncated && (
            <li className="border-t border-white/10 px-4 py-2 text-xs text-slate-500">
              Keep typing to narrow the list
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
