function pathValue(record, path) {
  const segments = String(path).match(/[^.[\]]+/g) || []
  let value = record
  for (const segment of segments) {
    if (value == null || !Object.prototype.hasOwnProperty.call(Object(value), segment)) return {exists: false, value: undefined}
    value = value[segment]
  }
  return {exists: true, value}
}

function deepIncludes(value, query) {
  if (value == null) return false
  if (Array.isArray(value)) return value.some(item => deepIncludes(item, query))
  if (typeof value === 'object') return Object.values(value).some(item => deepIncludes(item, query))
  return String(value).toLowerCase().includes(query)
}

function queryMatches(record, query, records) {
  const rawSearch = query.q
  const search = String(Array.isArray(rawSearch) ? rawSearch[0] : rawSearch || '').toLowerCase()
  if (search && !deepIncludes(record, search)) return false

  return Object.entries(query).every(([key, rawValues]) => {
    if (key === 'q' || key === 'callback' || key.startsWith('_')) return true
    const operatorMatch = /(_lte|_gte|_ne|_like)$/.exec(key)
    const operator = operatorMatch?.[1]?.slice(1)
    const field = operatorMatch ? key.slice(0, -operatorMatch[1].length) : key
    if (!operator && !records.some(item => pathValue(item, field).exists)) return true

    const actual = pathValue(record, field)
    if (!actual.exists || actual.value == null) return false
    const values = Array.isArray(rawValues) ? rawValues : [rawValues]
    const matches = value => {
      if (operator === 'gte') return value <= actual.value
      if (operator === 'lte') return value >= actual.value
      if (operator === 'ne') return value !== String(actual.value)
      if (operator === 'like') return new RegExp(String(value), 'i').test(String(actual.value))
      return value === String(actual.value)
    }
    return operator === 'ne' ? values.every(matches) : values.some(matches)
  })
}

function countMatchingRecords(records, query = {}, isVisible = () => true) {
  const rows = Array.isArray(records) ? records : []
  return rows.filter(record => isVisible(record) && queryMatches(record, query, rows)).length
}

module.exports = {countMatchingRecords}
