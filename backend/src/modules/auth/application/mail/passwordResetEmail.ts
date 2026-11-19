import { MailMessage } from '@/shared/providers/mail/MailProviderInterface';

export function buildPasswordResetEmail(link: string): Omit<MailMessage, 'to'> {
  const title = 'Redefina sua senha';
  const introduction = 'Recebemos uma solicitação para redefinir a senha da sua conta.';
  const ignore = 'Se você não solicitou a redefinição, ignore esta mensagem.';

  return {
    subject: title,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#211c13"><h1>${title}</h1><p>${introduction}</p><p><a href="${link}" style="display:inline-block;padding:12px 18px;background:#d6a746;color:#17130d;text-decoration:none;border-radius:6px">Criar nova senha</a></p><p>O link expira em 30 minutos e só pode ser usado uma vez.</p><p>${ignore}</p></div>`,
    text: `${introduction} Acesse ${link} em até 30 minutos. O link só pode ser usado uma vez. ${ignore}`,
  };
}
