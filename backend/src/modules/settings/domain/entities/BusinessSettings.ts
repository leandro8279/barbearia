export const DEFAULT_TIMEZONE = 'America/Sao_Paulo';

export interface BusinessSocials {
  instagram: string;
  facebook: string;
  tiktok: string;
  website: string;
}

export interface BusinessSettingsProps {
  unitId: string;
  name: string;
  cnpj: string;
  email: string;
  socials: BusinessSocials;
  timezone: string;
}

export class BusinessSettings {
  private constructor(private readonly props: BusinessSettingsProps) {}

  /** Usado quando a unidade ainda não tem configurações gravadas. */
  static defaultFor(unitId: string): BusinessSettings {
    return new BusinessSettings({
      unitId,
      name: '',
      cnpj: '',
      email: '',
      socials: { instagram: '', facebook: '', tiktok: '', website: '' },
      timezone: DEFAULT_TIMEZONE,
    });
  }

  static restore(props: BusinessSettingsProps): BusinessSettings {
    return new BusinessSettings({ ...props, socials: { ...props.socials } });
  }

  get unitId(): string {
    return this.props.unitId;
  }

  get name(): string {
    return this.props.name;
  }

  get cnpj(): string {
    return this.props.cnpj;
  }

  get email(): string {
    return this.props.email;
  }

  get socials(): BusinessSocials {
    return { ...this.props.socials };
  }

  get timezone(): string {
    return this.props.timezone;
  }
}
