let queue = Promise.resolve()

function withLock(work) {
  const current = queue.then(work, work)
  queue = current.catch(() => {})
  return current
}

module.exports = {withLock}
