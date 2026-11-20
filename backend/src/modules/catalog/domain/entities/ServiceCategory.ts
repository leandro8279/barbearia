export interface ServiceCategoryProps {
  id: string;
  name: string;
  slug: string;
  order: number;
}

export class ServiceCategory {
  private constructor(private readonly props: ServiceCategoryProps) {}

  static restore(props: ServiceCategoryProps): ServiceCategory {
    return new ServiceCategory({ ...props });
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

  get order(): number {
    return this.props.order;
  }
}
