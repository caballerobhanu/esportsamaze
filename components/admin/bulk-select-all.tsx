'use client';

import React from 'react';

/** Select-all checkbox for the admin bulk-action form (toggles every input[name="ids"]). */
export function BulkSelectAll() {
  return (
    <input
      type="checkbox"
      aria-label="Select all articles"
      onChange={(e) => {
        const checked = e.target.checked;
        document.querySelectorAll<HTMLInputElement>('input[name="ids"]').forEach((cb) => {
          cb.checked = checked;
        });
      }}
      className="h-4 w-4 cursor-pointer rounded border-slate-300 text-(--ed-blue) focus:ring-(--ed-blue)"
    />
  );
}
