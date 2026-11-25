import {apiRequest, buildQuery} from '@/shared/lib/http'

export interface ProductCategory {
  id: number
  name: string
  slug: string
}

export interface CatalogProduct {
  id: number
  sku: string
  name: string
  categoryId: number
  price: number
  costCents: number
  stock: number
  minStock: number
  kind: 'resale' | 'supply'
  commissionPct: number
  image: string
  active: boolean
}

export interface ProductQuery {
  page: number
  pageSize: number
  query: string
  categoryId?: number
  kind?: 'resale' | 'supply'
  stock?: 'low' | 'ok'
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export interface ProductPage {
  items: CatalogProduct[]
  total: number
  page: number
  pageSize: number
}

export type ProductSaveInput = Omit<CatalogProduct, 'id'>

export async function getAdminProducts(params: ProductQuery) {
  return apiRequest<ProductPage>(
    `/admin/catalog/products${buildQuery({
      _page: params.page,
      _limit: params.pageSize,
      q: params.query,
      categoryId: params.categoryId,
      kind: params.kind,
      stock: params.stock,
      _sort: params.sortBy,
      _order: params.sortOrder
    })}`
  )
}

export async function getProductCategories() {
  return apiRequest<ProductCategory[]>(`/productCategories${buildQuery({_page: 1, _limit: 100, _sort: 'name', _order: 'asc'})}`)
}

export async function getProduct(id: string) {
  return apiRequest<CatalogProduct>(`/admin/catalog/products/${encodeURIComponent(id)}`)
}

export async function saveProduct(id: string | null, product: ProductSaveInput) {
  return apiRequest<CatalogProduct>(id ? `/admin/catalog/products/${encodeURIComponent(id)}` : '/admin/catalog/products', {method: id ? 'PATCH' : 'POST', body: JSON.stringify(product)})
}

export async function adjustProductStock(id: number, delta: number, reason: string) {
  return apiRequest<{product: CatalogProduct; movement: {id: number; productId: number; type: 'adjust'; qty: number; reason: string}}>(`/admin/catalog/products/${id}/adjust-stock`, {
    method: 'POST',
    body: JSON.stringify({delta, reason})
  })
}
