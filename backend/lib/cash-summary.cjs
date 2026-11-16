const {getById, hasPermission, makeError} = require('./core.cjs')
const {expectedCash} = require('./checkout.cjs')

function getCashSummary(db, user) {
  if (!hasPermission(user, 'cash.read')) throw makeError(403, 'Sem permissão para consultar o caixa')

  const session = db.get('cashSessions').find({status: 'open'}).value()
  const openedBy = session ? getById(db, 'users', session.openedBy) : null
  const openTabs = db
    .get('tabs')
    .value()
    .filter(tab => tab.status === 'open')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(tab => {
      const customer = tab.customerId ? getById(db, 'users', tab.customerId) : null
      const barber = tab.barberId ? getById(db, 'barbers', tab.barberId) : null
      const barberUser = barber ? getById(db, 'users', barber.userId) : null
      return {
        id: Number(tab.id),
        appointmentId: tab.appointmentId ? Number(tab.appointmentId) : null,
        type: tab.type,
        customerName: customer?.name || (tab.type === 'counter' ? 'Venda avulsa' : 'Cliente'),
        barberName: barberUser?.name || barber?.name || null,
        totalCents: Number(tab.total) || 0,
        itemCount: (tab.items || []).reduce((sum, item) => sum + (Number(item.qty) || 0), 0),
        createdAt: tab.createdAt
      }
    })

  return {
    session:
      session ?
        {id: Number(session.id), openingCents: Number(session.openingCents) || 0, openedAt: session.openedAt, openedBy: Number(session.openedBy), openedByName: openedBy?.name || 'Equipe'}
      : null,
    balanceByMethod: session ? expectedCash(db, session) : null,
    openTabs
  }
}

module.exports = {getCashSummary}
