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

  updateInfo(input: { name: string; cnpj: string; email: string; socials: BusinessSocials }): void {
    Object.assign(this.props, {
      name: input.name.trim(),
      cnpj: input.cnpj,
      email: input.email,
      socials: { ...input.socials },
      timezone: DEFAULT_TIMEZONE,
    });
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
