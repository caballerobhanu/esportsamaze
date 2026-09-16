'use client';

import type { ReactNode } from 'react';

/**
 * A submit button that asks first.
 *
 * Destructive admin actions sit in ordinary server-action forms, so the guard
 * has to live on the client. Cancelling calls preventDefault, which stops the
 * form's action from running at all.
 */
export function ConfirmSubmit({
  children,
  message,
  className,
}: {
  children: ReactNode;
  message: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
