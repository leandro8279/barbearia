import { MailMessage } from '@/shared/providers/mail/MailProviderInterface';

export function buildTeamInvitationEmail(link: string, ttlHours: number): Omit<MailMessage, 'to'> {
  const title = 'Seu acesso à Barbearia está pronto';
  const introduction = 'Você foi convidado para acessar o painel da equipe. Defina uma senha para começar.';
  const ignore = 'Se você não esperava este convite, ignore esta mensagem.';

  return {
    subject: 'Convite para acessar a Barbearia',
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#211c13"><h1>${title}</h1><p>${introduction}</p><p><a href="${link}" style="display:inline-block;padding:12px 18px;background:#d6a746;color:#17130d;text-decoration:none;border-radius:6px">Definir senha</a></p><p>O link expira em ${ttlHours} horas e só pode ser usado uma vez.</p><p>${ignore}</p></div>`,
    text: `${introduction} Acesse ${link} em até ${ttlHours} horas. O link só pode ser usado uma vez. ${ignore}`,
  };
}
