export interface BarberServiceLink {
  serviceId: string;
  commissionPct: number;
}

export interface BarberProps {
  id: string;
  userId: string;
  /** Nome de exibição (vem do usuário vinculado). */
  name: string;
  slug: string;
  bio: string;
  specialties: string[];
  commissionServicePct: number;
  commissionProductPct: number;
  photo: string | null;
  pixKey: string | null;
  active: boolean;
  serviceLinks: BarberServiceLink[];
}

export class Barber {
  private constructor(private readonly props: BarberProps) {}

  static restore(props: BarberProps): Barber {
    return new Barber({
      ...props,
      specialties: [...props.specialties],
      serviceLinks: props.serviceLinks.map((link) => ({ ...link })),
    });
  }

  /** Barbeiro sem nenhum vínculo atende todos os serviços. */
  isAssignedTo(serviceId: string): boolean {
    return this.props.serviceLinks.length === 0 || this.props.serviceLinks.some((link) => link.serviceId === serviceId);
  }

  /** Comissão específica do vínculo, ou null quando não há vínculo explícito. */
  commissionFor(serviceId: string): number | null {
    return this.props.serviceLinks.find((link) => link.serviceId === serviceId)?.commissionPct ?? null;
  }

  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get bio(): string {
    return this.props.bio;
  }

  get specialties(): string[] {
    return [...this.props.specialties];
  }

  get commissionServicePct(): number {
    return this.props.commissionServicePct;
  }

  get commissionProductPct(): number {
    return this.props.commissionProductPct;
  }

  get photo(): string | null {
    return this.props.photo;
  }

  get pixKey(): string | null {
    return this.props.pixKey;
  }

  get active(): boolean {
    return this.props.active;
  }

  get serviceLinks(): BarberServiceLink[] {
    return this.props.serviceLinks.map((link) => ({ ...link }));
  }
}
