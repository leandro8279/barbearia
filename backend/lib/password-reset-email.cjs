function isProduction() {
  return process.env.NODE_ENV === 'production'
}

function appBaseUrl() {
  if (!isProduction() && process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`
  if (!isProduction()) return 'http://localhost:5000'
  if (!process.env.PUBLIC_APP_URL) throw new Error('PUBLIC_APP_URL não configurada para recuperação de senha')

  const url = new URL(process.env.PUBLIC_APP_URL)
  if (url.protocol !== 'https:') throw new Error('PUBLIC_APP_URL precisa usar HTTPS')
  return url.origin
}

function resetUrl(token) {
  return new URL(`/redefinir-senha/${encodeURIComponent(token)}`, appBaseUrl()).toString()
}

function logDevelopmentLink(token) {
  console.info(`[auth] Link de recuperação de senha: ${resetUrl(token)}`)
}

async function send(email, token) {
  return sendMessage({
    email,
    token,
    subject: 'Redefina sua senha',
    title: 'Redefina sua senha',
    introduction: 'Recebemos uma solicitação para redefinir a senha da sua conta.',
    action: 'Criar nova senha',
    ignoreMessage: 'Se você não solicitou a redefinição, ignore esta mensagem.'
  })
}

async function sendInvitation(email, token) {
  return sendMessage({
    email,
    token,
    subject: 'Convite para acessar a Barbearia',
    title: 'Seu acesso à Barbearia está pronto',
    introduction: 'Você foi convidado para acessar o painel da equipe. Defina uma senha para começar.',
    action: 'Definir senha',
    ignoreMessage: 'Se você não esperava este convite, ignore esta mensagem.'
  })
}

async function sendMessage({email, token, subject, title, introduction, action, ignoreMessage}) {
  const from = String(process.env.RESEND_FROM_EMAIL || '').trim()
  if (!from) throw new Error('RESEND_FROM_EMAIL não configurada')
  const link = resetUrl(token)
  const {ReplitConnectors} = await import('@replit/connectors-sdk')
  const connectors = new ReplitConnectors()
  const response = await connectors.proxy('resend', '/emails', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      from,
      to: [email],
      subject,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#211c13"><h1>${title}</h1><p>${introduction}</p><p><a href="${link}" style="display:inline-block;padding:12px 18px;background:#d6a746;color:#17130d;text-decoration:none;border-radius:6px">${action}</a></p><p>O link expira em 30 minutos e só pode ser usado uma vez.</p><p>${ignoreMessage}</p></div>`,
      text: `${introduction} Acesse ${link} em até 30 minutos. O link só pode ser usado uma vez. ${ignoreMessage}`
    })
  })

  if (!response.ok) throw new Error(`Resend retornou HTTP ${response.status}`)
}

module.exports = {logDevelopmentLink, send, sendInvitation}
