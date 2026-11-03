"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

// Every inhabited country and territory, by ISO 3166-1 code; names come from the browser in English.
const CODES =
  "AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GT GU GW GY HK HN HR HT HU ID IE IL IM IN IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW".split(" ");

// Where the browser's English name isn't the one people use.
const NAME: Record<string, string> = {
  CD: "Democratic Republic of the Congo",
  CG: "Republic of the Congo",
  CI: "Côte d’Ivoire",
  HK: "Hong Kong",
  MM: "Myanmar",
  MO: "Macao",
  PS: "Palestine",
  XK: "Kosovo",
};
// Other names people type.
const ALIASES: Record<string, string[]> = {
  US: ["usa", "united states of america", "america"],
  GB: ["uk", "britain", "great britain", "england", "scotland", "wales", "northern ireland"],
  AE: ["uae", "emirates"],
  CD: ["drc", "dr congo", "congo kinshasa", "zaire"],
  CG: ["congo brazzaville"],
  CI: ["ivory coast"],
  MM: ["burma"],
  TR: ["turkey", "turkiye"],
  CZ: ["czech republic", "czechia"],
  SZ: ["swaziland", "eswatini"],
  MK: ["macedonia"],
  TL: ["east timor"],
  KR: ["korea", "south korea"],
  KP: ["north korea"],
  LA: ["laos"],
  RU: ["russia"],
  VN: ["viet nam"],
  CV: ["cape verde"],
  NL: ["holland"],
  IR: ["persia"],
  SY: ["syria"],
  BO: ["bolivia"],
  VE: ["venezuela"],
  TZ: ["tanzania"],
};

const plain = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

type Country = { code: string; name: string; keys: string[] };

function useCountries(): Country[] {
  return useMemo(() => {
    const names = typeof Intl !== "undefined" && "DisplayNames" in Intl ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
    return CODES.map((code) => {
      const name = NAME[code] ?? names?.of(code) ?? code;
      return { code, name, keys: [plain(name), ...(ALIASES[code] ?? [])] };
    }).sort((a, b) => a.name.localeCompare(b.name, "en"));
  }, []);
}

/** The country the browser says it is in, from its language setting, if it names one. */
function guess(countries: Country[]): Country | null {
  if (typeof navigator === "undefined") return null;
  for (const tag of navigator.languages ?? [navigator.language]) {
    const region = tag.split("-")[1]?.toUpperCase();
    const hit = region && countries.find((c) => c.code === region);
    if (hit) return hit;
  }
  return null;
}

/**
 * Pick a country by typing any part of its name (or a common other name: USA, Burma, DRC).
 * The arrow keys move through the matches, Enter picks one, Escape closes the list.
 */
export function CountryPicker({ value, onChange, inputId }: { value: string; onChange: (v: string) => void; inputId: string }) {
  const countries = useCountries();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [active, setActive] = useState(0);
  const [suggested, setSuggested] = useState<Country | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setSuggested(guess(countries)), 0);
    return () => window.clearTimeout(id);
  }, [countries]);

  const matches = useMemo(() => {
    const q = plain(query);
    const exact = countries.find((c) => c.name === query);
    // A country already chosen stays first, so the list can still be browsed to change it.
    if (exact) return [exact, ...countries.filter((c) => c.code !== exact.code)];
    if (!q) return suggested ? [suggested, ...countries.filter((c) => c.code !== suggested.code)] : countries;
    const starts = countries.filter((c) => c.keys.some((k) => k.startsWith(q) || k.split(" ").some((w) => w.startsWith(q))));
    const inside = countries.filter((c) => !starts.includes(c) && c.keys.some((k) => k.includes(q)));
    return [...starts, ...inside];
  }, [query, countries, suggested]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function pick(c: Country) {
    setQuery(c.name);
    onChange(c.name);
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(matches.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && open && matches[active]) {
      e.preventDefault();
      pick(matches[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative mt-2">
      <div className="relative">
        <input
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && matches[active] ? `${listId}-${matches[active].code}` : undefined}
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder="Search 240 countries"
          maxLength={60}
          className="field pr-10 placeholder:text-ink-3"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Show countries"
          onClick={() => setOpen((o) => !o)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-ink-3 hover:text-ink"
        >
          <svg viewBox="0 0 16 16" className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="m4 6 4 4 4-4" />
          </svg>
        </button>
      </div>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 max-h-72 overflow-y-auto rounded-[14px] bg-surface p-1.5 shadow-[0_18px_44px_-18px_rgb(var(--shadow)/0.55),inset_0_0_0_1px_var(--line-strong)]"
        >
          {matches.length === 0 && <li className="px-3 py-2.5 text-[0.9375rem] text-ink-3">No country by that name. Keep what you typed, and the report uses it.</li>}
          {matches.map((c, i) => (
            <li
              key={c.code}
              id={`${listId}-${c.code}`}
              data-index={i}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(c);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-[10px] px-3 py-2 text-[0.9375rem] ${i === active ? "bg-canvas-2 text-ink" : "text-ink"}`}
            >
              <span>{c.name}</span>
              {suggested?.code === c.code && !plain(query) && <span className="text-[0.8125rem] text-ink-3">From this device</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
