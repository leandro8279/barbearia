import type { ProductCategory } from '@/modules/catalog/domain/entities/ProductCategory';

export const PRODUCT_KINDS = ['resale', 'supply'] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];

export interface ProductProps {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  price: number;
  costCents: number;
  stock: number;
  minStock: number;
  kind: ProductKind;
  commissionPct: number;
  image: string;
  active: boolean;
}

export class Product {
  private constructor(private readonly props: ProductProps) {}

  static restore(props: ProductProps): Product {
    return new Product({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get sku(): string {
    return this.props.sku;
  }

  get name(): string {
    return this.props.name;
  }

  get category(): ProductCategory {
    return this.props.category;
  }

  get categoryId(): string {
    return this.props.category.id;
  }

  get price(): number {
    return this.props.price;
  }

  get costCents(): number {
    return this.props.costCents;
  }

  get stock(): number {
    return this.props.stock;
  }

  get minStock(): number {
    return this.props.minStock;
  }

  get kind(): ProductKind {
    return this.props.kind;
  }

  get commissionPct(): number {
    return this.props.commissionPct;
  }

  get image(): string {
    return this.props.image;
  }

  get active(): boolean {
    return this.props.active;
  }
}
