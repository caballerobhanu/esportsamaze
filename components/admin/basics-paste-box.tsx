'use client';

import * as React from 'react';
import { TabPasteBox, type TabPastePreview } from '@/components/admin/tab-paste-box';
import { BASICS_SAMPLE, parseBasicsSheet, type ParsedBasicsRow } from '@/lib/basics-paste';

/**
 * Applies a Basics paste to the tournament form's own inputs.
 *
 * The Basics tab is uncontrolled — plain inputs with `defaultValue` and `name` — so there is
 * no React state to write into. A paste sets each input's value the way typing would and then
 * dispatches input/change so anything listening (the region picker, for one) sees it too. The
 * form still submits whatever the inputs hold, so the save path is unchanged.
 *
 * A `select` is matched by option text as well as by value, so a sheet can say `Game: BGMI`
 * or `Tier: S-Tier` rather than an opaque id. Lookup is scoped to the enclosing form and
 * takes the first match; every field it cannot resolve is reported by name, never skipped.
 */
export function BasicsPasteBox() {
  const [message, setMessage] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const preview = (text: string): TabPastePreview => {
    const res = parseBasicsSheet(text);
    if (res.error) return { summary: [], unrecognised: res.unrecognised, error: res.error };
    return {
      summary: [`${res.rows.length} field${res.rows.length === 1 ? '' : 's'} recognised`],
      unrecognised: res.unrecognised,
      error: null,
    };
  };

  const writeField = (form: HTMLFormElement, row: ParsedBasicsRow): string | null => {
    const el = form.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${row.field}"]`);
    if (!el) return `${row.asTyped} (no input on this form)`;

    if (el instanceof HTMLSelectElement) {
      const wanted = row.value.trim().toLowerCase();
      const option = Array.from(el.options).find(
        (opt) => opt.value.trim().toLowerCase() === wanted || opt.text.trim().toLowerCase() === wanted,
      );
      if (!option) return `${row.asTyped} (no option "${row.value}")`;
      el.value = option.value;
    } else {
      el.value = row.value;
    }

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return null;
  };

  const apply = (text: string) => {
    const form = containerRef.current?.closest('form');
    if (!form) {
      setMessage('Could not find the tournament form to fill.');
      return;
    }

    const res = parseBasicsSheet(text);
    const missed: string[] = [];
    let filled = 0;

    for (const row of res.rows) {
      const problem = writeField(form as HTMLFormElement, row);
      if (problem) missed.push(problem);
      else filled += 1;
    }

    const parts = [`${filled} field${filled === 1 ? '' : 's'} filled`];
    if (missed.length > 0) parts.push(`not applied: ${missed.join(', ')}`);
    setMessage(parts.join(' — '));
  };

  return (
    <div ref={containerRef} className="space-y-2">
      <TabPasteBox
        label="Tournament identity & social links — paste from a sheet"
        hint="Two columns: field name, then value. Covers section 1 (identity, game, tier, mode, platform) and section 9 (the eight social channels). Use the field names or the labels the form itself shows."
        sampleHeader={BASICS_SAMPLE}
        parse={preview}
        onApply={apply}
      />
      {message && (
        <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">{message}</p>
      )}
    </div>
  );
}
