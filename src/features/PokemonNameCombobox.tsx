"use client";

import type { PokemonSpecies } from "@/domain/types";
import { normalizeName } from "@/utils/kana";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

interface Props {
  value: string;
  options: PokemonSpecies[];
  onSelect: (species: PokemonSpecies) => void;
  inputId?: string;
  placeholder?: string;
}

export function PokemonNameCombobox({
  value,
  options,
  onSelect,
  inputId,
  placeholder,
}: Props) {
  const autoId = useId();
  const listboxId = `${inputId ?? autoId}-listbox`;
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [composing, setComposing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const matches = useMemo(() => {
    const q = normalizeName(query);
    if (!q) return options;
    return options.filter((p) => normalizeName(p.name).includes(q));
  }, [query, options]);

  useEffect(() => {
    setHighlight(0);
  }, [matches]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLLIElement>(
      `[data-index="${highlight}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, open]);

  const commit = (species: PokemonSpecies) => {
    if (species.name !== value) onSelect(species);
    setQuery(species.name);
    setOpen(false);
  };

  const commitFromText = (raw: string) => {
    const q = raw.trim();
    if (!q) {
      setQuery(value);
      setOpen(false);
      return;
    }
    const nq = normalizeName(q);
    const exact =
      options.find((p) => p.name === q) ??
      options.find((p) => normalizeName(p.name) === nq);
    const hit = exact ?? options.find((p) => normalizeName(p.name).includes(nq));
    if (!hit) {
      setQuery(value);
      setOpen(false);
      return;
    }
    commit(hit);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (composing) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => (matches.length === 0 ? 0 : Math.min(matches.length - 1, h + 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (open && matches[highlight]) {
        commit(matches[highlight]);
      } else {
        commitFromText(query);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setQuery(value);
      setOpen(false);
    }
  };

  const activeId =
    open && matches[highlight] ? `${listboxId}-opt-${highlight}` : undefined;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        className="input"
        value={query}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => setComposing(false)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          window.setTimeout(() => {
            if (document.activeElement === inputRef.current) return;
            commitFromText(query);
          }, 0);
        }}
      />
      {open && matches.length > 0 && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="absolute z-10 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded shadow-sm"
        >
          {matches.map((p, i) => (
            <li
              key={p.id}
              id={`${listboxId}-opt-${i}`}
              data-index={i}
              role="option"
              aria-selected={i === highlight}
              className={`px-2 py-1.5 text-sm cursor-pointer ${
                i === highlight ? "bg-blue-100" : "hover:bg-slate-100"
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                commit(p);
              }}
              onMouseEnter={() => setHighlight(i)}
            >
              {p.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
