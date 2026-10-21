'use client';

import { useActionState } from 'react';
import type { FormState } from '@/app/actions';

/** Formularz dla akcji serwerowej zwracającej { error }. */
export function ActionForm({
  action,
  children,
  submit,
  className,
}: {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  children: React.ReactNode;
  submit: string;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.error && <p className="error">{state.error}</p>}
      <button className="btn" disabled={pending}>{pending ? 'Zapisywanie…' : submit}</button>
    </form>
  );
}
