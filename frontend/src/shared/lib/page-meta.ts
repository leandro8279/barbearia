const BARBERSHOP_SCRIPT_ID = 'barbearia-json-ld'
const OPEN_GRAPH_IMAGE = '/og-barbearia.svg'

function setMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.append(element)
  }
  if (element.content !== content) element.content = content
}

export function syncOpenGraph() {
  const title = document.title || 'Barbearia'
  const description = document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content || 'Agende seu próximo corte na Barbearia.'
  const pageUrl = `${window.location.origin}${window.location.pathname}${window.location.search}`

  setMeta('meta[property="og:title"]', 'property', 'og:title', title)
  setMeta('meta[property="og:description"]', 'property', 'og:description', description)
  setMeta('meta[property="og:type"]', 'property', 'og:type', 'website')
  setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', 'Barbearia')
  setMeta('meta[property="og:url"]', 'property', 'og:url', pageUrl)
  setMeta('meta[property="og:image"]', 'property', 'og:image', `${window.location.origin}${OPEN_GRAPH_IMAGE}`)
}

export function setPageMetadata(title: string, description: string, includeBarberShop = false, titleSuffix = 'Barbearia') {
  document.title = `${title} | ${titleSuffix}`
  setMeta('meta[name="description"]', 'name', 'description', description)
  syncOpenGraph()

  const current = document.getElementById(BARBERSHOP_SCRIPT_ID)
  if (!includeBarberShop) {
    current?.remove()
    return
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BarberShop',
    name: 'Barbearia',
    description: 'Agende seu próximo corte na Barbearia.',
    url: window.location.origin,
    image: `${window.location.origin}${OPEN_GRAPH_IMAGE}`
  }
  const serialized = JSON.stringify(schema)
  const script = current instanceof HTMLScriptElement ? current : document.createElement('script')
  script.id = BARBERSHOP_SCRIPT_ID
  script.type = 'application/ld+json'
  if (script.textContent !== serialized) script.textContent = serialized
  if (!current) document.head.append(script)
}
