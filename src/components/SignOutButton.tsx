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
      className="rounded-lg border-2 border-black bg-white px-3.5 py-2 text-[12px] font-bold uppercase tracking-[0.04em] text-black transition-colors hover:bg-danger hover:text-white disabled:opacity-50"
    >
      {busy ? '…' : 'Se déconnecter'}
    </button>
  );
}
