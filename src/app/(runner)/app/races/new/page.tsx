import type { Metadata } from 'next';
import Link from 'next/link';
import { NewRaceForm } from './NewRaceForm';
import { Eyebrow } from '@/components/ui/Surface';

export const metadata: Metadata = { title: 'Nouvelle course', robots: { index: false } };

export default function NewRacePage() {
  return (
    <main className="mx-auto max-w-xl px-5 py-12 sm:px-8">
      <Link
        href="/app"
        className="text-[13px] text-charcoal-faint transition-colors hover:text-charcoal"
      >
        ← Mes courses
      </Link>

      <div className="mt-6">
        <Eyebrow>Étape unique</Eyebrow>
        <h1 className="mt-3 text-title text-charcoal">Importe ton parcours</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-charcoal-muted">
          Le fichier .gpx de ta course. L’organisateur le fournit presque toujours&nbsp;; sinon,
          exporte-le depuis Strava, Garmin Connect, Komoot ou OpenRunner.
        </p>
      </div>

      <div className="mt-8">
        <NewRaceForm />
      </div>
    </main>
  );
}
