export interface ProductCategoryProps {
  id: string;
  name: string;
  slug: string;
}

export class ProductCategory {
  private constructor(private readonly props: ProductCategoryProps) {}

  static restore(props: ProductCategoryProps): ProductCategory {
    return new ProductCategory({ ...props });
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }
}
