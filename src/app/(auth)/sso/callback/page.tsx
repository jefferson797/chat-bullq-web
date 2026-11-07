'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, TriangleAlert } from 'lucide-react';
import { authService } from '@/features/auth/services/auth.service';
import { useAuthStore } from '@/stores/auth-store';
import { TunerLogo } from '@/components/ui/tuner-logo';

/**
 * `useSearchParams` só existe no navegador, e sem este limite de Suspense o
 * Next tenta pré-renderizar a página no build e quebra. O conteúdo real vive
 * no componente de baixo.
 */
export default function SsoCallbackPage() {
  return (
    <Suspense
      fallback={
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Entrando…
        </p>
      }
    >
      <Retorno />
    </Suspense>
  );
}

/**
 * Volta do login único: o TunerID manda a pessoa para cá com o bilhete.
 *
 * Duas conferências antes de qualquer coisa:
 *
 * 1. O `state` tem que ser o mesmo que esta aba gerou ao sair. É o que prova
 *    que o login começou aqui, e não que alguém mandou um link pronto.
 * 2. A troca do bilhete pela identidade é feita pelo SERVIDOR do Conversas, com
 *    o segredo dele. O navegador só carrega o bilhete de um lado para o outro,
 *    e por isso o bilhete vale uma vez só e por 60 segundos.
 */
function Retorno() {
  const router = useRouter();
  const params = useSearchParams();
  const { setAuth } = useAuthStore();
  const [erro, setErro] = useState<string | null>(null);
  const jaTrocou = useRef(false);

  useEffect(() => {
    // Em dev o React roda o efeito duas vezes, e o bilhete vale UMA. Sem esta
    // trava a segunda tentativa falharia e a tela mostraria erro num login que
    // na verdade deu certo.
    if (jaTrocou.current) return;
    jaTrocou.current = true;

    const codigo = params.get('code');
    const state = params.get('state');
    const esperado = sessionStorage.getItem('sso_state');
    sessionStorage.removeItem('sso_state');

    if (!codigo) {
      setErro('O TunerID não mandou o bilhete de entrada. Tente entrar de novo.');
      return;
    }
    if (!esperado || state !== esperado) {
      setErro(
        'Este pedido de entrada não começou nesta aba. Por segurança, não vou usá-lo. ' +
        'Volte ao login e clique em "Entrar com TunerID".',
      );
      return;
    }

    authService
      .loginPorTunerId(codigo)
      .then((result) => {
        localStorage.setItem('access_token', result.accessToken);
        localStorage.setItem('refresh_token', result.refreshToken);
        setAuth(result.user, result.organizations);
        router.replace('/inbox');
      })
      .catch((e: unknown) => {
        setErro(e instanceof Error ? e.message : 'Não foi possível entrar');
      });
  }, [params, router, setAuth]);

  return (
    <div className="mx-auto w-full max-w-sm space-y-8 text-center">
      <TunerLogo className="mx-auto h-7 w-auto text-zinc-900 dark:text-white" />
      {erro ? (
        <div className="space-y-4 rounded-md border border-destructive/30 bg-destructive/5 p-5">
          <TriangleAlert className="mx-auto h-5 w-5 text-destructive" />
          <p className="text-sm text-muted-foreground">{erro}</p>
          <button
            onClick={() => router.replace('/login')}
            className="inline-flex h-9 items-center justify-center rounded-md border border-input px-4 text-sm font-medium hover:bg-accent"
          >
            Voltar ao login
          </button>
        </div>
      ) : (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Entrando com o TunerID…
        </p>
      )}
    </div>
  );
}
