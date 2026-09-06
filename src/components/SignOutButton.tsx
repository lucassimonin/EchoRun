'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await createClient().auth.signOut();
        router.replace('/');
        router.refresh();
      }}
      className="rounded-full px-3.5 py-2 text-[13px] text-charcoal-muted transition-colors hover:bg-charcoal/[0.04] hover:text-charcoal disabled:opacity-50"
    >
      {busy ? '…' : 'Se déconnecter'}
    </button>
  );
}
