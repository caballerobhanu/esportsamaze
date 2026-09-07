'use client';

import React, { useState } from 'react';

/**
 * Icon button that invokes a server action with an id argument directly.
 * Used inside the admin bulk form because React strips a button's `name`
 * when it carries a function `formAction`, so FormData buttons there can't
 * carry a per-row id.
 */
export function ActionIconButton({
  action,
  arg,
  title,
  className,
  confirmMessage,
  children,
}: {
  action: (id: string) => Promise<void>;
  arg: string;
  title: string;
  className?: string;
  confirmMessage?: string;
  children: React.ReactNode;
}) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      title={title}
      className={className}
      onClick={async () => {
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        setPending(true);
        try {
          await action(arg);
        } finally {
          setPending(false);
        }
      }}
    >
      {children}
    </button>
  );
}
