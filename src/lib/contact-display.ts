/**
 * Nome de exibição do contato, em ordem de preferência:
 * 1. firstName + lastName (cadastro manual — mais confiável)
 * 2. name (nome do perfil do WhatsApp)
 * 3. phone
 */
export interface ContactDisplayParts {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  phone?: string | null;
}

/** Nome real da pessoa (sem fallback pra telefone) — use em variáveis de mensagem. */
export function contactRealName(c: ContactDisplayParts | null | undefined): string | null {
  if (!c) return null;
  const fullName = [c.firstName, c.lastName]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(' ');
  return fullName || c.name?.trim() || null;
}

export function contactDisplayName(c: ContactDisplayParts | null | undefined): string {
  return contactRealName(c) || c?.phone || 'Desconhecido';
}

/** Nome + empresa: "Maria Silva · Exatek". Sem empresa, só o nome. */
export function contactDisplayTitle(c: ContactDisplayParts | null | undefined): string {
  const name = contactDisplayName(c);
  const company = c?.company?.trim();
  return company ? `${name} · ${company}` : name;
}
