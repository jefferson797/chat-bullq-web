'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Star, Loader2, CheckCircle2 } from 'lucide-react';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type Phase = 'form' | 'sending' | 'done' | 'already';

export default function AvaliarPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;

  const [score, setScore] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (score < 1) {
      setError('Toque em uma estrela pra dar sua nota 🙂');
      return;
    }
    setError(null);
    setPhase('sending');
    try {
      const resp = await fetch(`${API_URL}/ratings/public/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, comment: comment.trim() || undefined }),
      });
      if (resp.ok) {
        setPhase('done');
        return;
      }
      const data = await resp.json().catch(() => ({}));
      const msg: string = Array.isArray(data?.message)
        ? data.message[0]
        : data?.message || '';
      if (resp.status === 400 && /already/i.test(msg)) {
        setPhase('already');
        return;
      }
      if (resp.status === 404) {
        setError('Link de avaliação inválido ou expirado.');
        setPhase('form');
        return;
      }
      setError('Não foi possível enviar. Tente de novo em instantes.');
      setPhase('form');
    } catch {
      setError('Sem conexão. Verifique sua internet e tente de novo.');
      setPhase('form');
    }
  };

  const stars = [1, 2, 3, 4, 5];
  const active = hover || score;
  const LABELS: Record<number, string> = {
    1: 'Péssimo',
    2: 'Ruim',
    3: 'Ok',
    4: 'Bom',
    5: 'Excelente',
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-4 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-zinc-900 sm:p-8">
        {phase === 'done' || phase === 'already' ? (
          <div className="flex flex-col items-center text-center">
            <CheckCircle2 className="h-14 w-14 text-emerald-500" />
            <h1 className="mt-4 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {phase === 'done' ? 'Obrigado pela avaliação! 🙏' : 'Você já avaliou 🙏'}
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {phase === 'done'
                ? 'Seu retorno ajuda a gente a melhorar cada vez mais o atendimento.'
                : 'Obrigado! Já registramos sua nota deste atendimento.'}
            </p>
          </div>
        ) : (
          <>
            <h1 className="text-center text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              Como foi seu atendimento?
            </h1>
            <p className="mt-1.5 text-center text-sm text-zinc-500 dark:text-zinc-400">
              Toque nas estrelas pra dar sua nota. É rapidinho!
            </p>

            <div className="mt-6 flex justify-center gap-1.5">
              {stars.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-label={`${s} estrela${s > 1 ? 's' : ''}`}
                  onClick={() => {
                    setScore(s);
                    setError(null);
                  }}
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-10 w-10 ${
                      s <= active
                        ? 'fill-amber-400 text-amber-400'
                        : 'fill-transparent text-zinc-300 dark:text-zinc-600'
                    }`}
                  />
                </button>
              ))}
            </div>
            <p className="mt-2 h-5 text-center text-sm font-medium text-amber-600 dark:text-amber-400">
              {active ? LABELS[active] : ''}
            </p>

            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Quer deixar um comentário? (opcional)"
              rows={3}
              maxLength={1000}
              className="mt-4 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />

            {error && (
              <p className="mt-3 text-center text-sm text-red-500">{error}</p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={phase === 'sending'}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {phase === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />}
              Enviar avaliação
            </button>
          </>
        )}
      </div>
    </div>
  );
}
