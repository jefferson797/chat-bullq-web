'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { KeyRound, Loader2 } from 'lucide-react';
import { loginSchema, type LoginFormData } from '../schemas/login.schema';
import { authService } from '../services/auth.service';
import { useAuthStore } from '@/stores/auth-store';
import { TunerLogo } from '@/components/ui/tuner-logo';

/** Vazio = login único desligado neste ambiente, e o botão nem aparece. */
const TUNERID_WEB = process.env.NEXT_PUBLIC_TUNERID_WEB_URL ?? '';

export function LoginForm() {
  const router = useRouter();
  const { setAuth, setActiveOrg } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  // Como se entra aqui. "emergencia": só o TunerID, e a senha local fica para a
  // conta de emergência (o dia em que o TunerID cair). "todos": transição.
  const { data: modo } = useQuery({ queryKey: ['auth-modo'], queryFn: () => authService.modo(), retry: 1 });
  const soTunerId = !!TUNERID_WEB && modo?.senha === 'emergencia';
  const [emergencia, setEmergencia] = useState(false);
  const mostraSenha = !soTunerId || emergencia;

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  /**
   * Manda a pessoa para o TunerID começando o pedido DAQUI.
   *
   * O `state` é gerado aqui e guardado na sessão deste navegador. Quando o
   * bilhete voltar, a página de retorno confere se o state é o mesmo: é assim
   * que ela sabe que o login partiu desta aba, e não de um link que alguém
   * mandou pronto.
   */
  const entrarComTunerId = () => {
    const state = crypto.randomUUID().replace(/-/g, '');
    sessionStorage.setItem('sso_state', state);
    window.location.href = `${TUNERID_WEB}/sso/conversas?state=${state}`;
  };

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const result = await authService.login(data);

      localStorage.setItem('access_token', result.accessToken);
      localStorage.setItem('refresh_token', result.refreshToken);

      setAuth(result.user, result.organizations);
      // setAuth already picks the best org (stored or first available)

      toast.success(`Bem-vindo, ${result.user.name}!`);
      router.push('/inbox');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-sm space-y-8">
      <div className="flex flex-col items-center space-y-3 text-center">
        <TunerLogo className="h-7 w-auto text-zinc-900 dark:text-white" />
        <div className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-400">
          Conversas <span className="mx-0.5 text-zinc-300">|</span> Exatek
        </div>
        <p className="text-sm text-muted-foreground">
          Entre na sua conta para acessar o painel
        </p>
      </div>

      {TUNERID_WEB && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={entrarComTunerId}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            <KeyRound className="h-4 w-4" />
            Entrar com TunerID
          </button>
          {mostraSenha ? (
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {soTunerId ? 'conta de emergência' : 'ou com a senha daqui'}
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setEmergencia(true)}
              className="w-full text-center text-[11px] text-muted-foreground hover:text-foreground"
            >
              Acesso de emergência
            </button>
          )}
        </div>
      )}

      {mostraSenha && (
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="seu@email.com"
            {...form.register('email')}
          />
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="••••••"
            {...form.register('password')}
          />
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">
              {form.formState.errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
        >
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Entrar
        </button>
      </form>
      )}
    </div>
  );
}
