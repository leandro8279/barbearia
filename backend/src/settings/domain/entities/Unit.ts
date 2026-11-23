import { randomUUID } from 'node:crypto';

export interface UnitAddressDetails {
  zip: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  reference: string;
}

export interface TimeRange {
  start: string; // HH:mm
  end: string; // HH:mm
}

export interface BusinessHour {
  weekday: number; // 0 = domingo ... 6 = sábado
  ranges: TimeRange[];
}

export interface Holiday {
  date: string; // YYYY-MM-DD
  name: string;
  closed: boolean;
  ranges: TimeRange[];
}

export interface UnitProps {
  id: string;
  name: string;
  address: string;
  addressDetails: UnitAddressDetails;
  phone: string;
  whatsapp: string;
  logo: string | null;
  amenities: string[];
  photos: string[];
  businessHours: BusinessHour[];
  holidays: Holiday[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUnitInput {
  name: string;
  address?: string;
  addressDetails?: Partial<UnitAddressDetails>;
  phone: string;
  whatsapp?: string;
  logo?: string | null;
  amenities?: string[];
  photos?: string[];
  businessHours?: BusinessHour[];
  holidays?: Holiday[];
}

export const EMPTY_ADDRESS_DETAILS: UnitAddressDetails = {
  zip: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
  reference: '',
};

export class Unit {
  private constructor(private readonly props: UnitProps) {}

  static create(input: CreateUnitInput): Unit {
    const now = new Date();

    return new Unit({
      id: randomUUID(),
      name: input.name.trim(),
      address: input.address ?? '',
      addressDetails: { ...EMPTY_ADDRESS_DETAILS, ...input.addressDetails },
      phone: input.phone,
      whatsapp: input.whatsapp ?? '',
      logo: input.logo ?? null,
      amenities: input.amenities ?? [],
      photos: input.photos ?? [],
      businessHours: input.businessHours ?? [],
      holidays: input.holidays ?? [],
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: UnitProps): Unit {
    return new Unit({
      ...props,
      addressDetails: { ...props.addressDetails },
      amenities: [...props.amenities],
      photos: [...props.photos],
      businessHours: props.businessHours.map((hour) => ({ ...hour, ranges: hour.ranges.map((range) => ({ ...range })) })),
      holidays: props.holidays.map((holiday) => ({ ...holiday, ranges: holiday.ranges.map((range) => ({ ...range })) })),
    });
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get address(): string {
    return this.props.address;
  }

  get addressDetails(): UnitAddressDetails {
    return { ...this.props.addressDetails };
  }

  get phone(): string {
    return this.props.phone;
  }

  get whatsapp(): string {
    return this.props.whatsapp;
  }

  get logo(): string | null {
    return this.props.logo;
  }

  get amenities(): string[] {
    return [...this.props.amenities];
  }

  get photos(): string[] {
    return [...this.props.photos];
  }

  get businessHours(): BusinessHour[] {
    return this.props.businessHours.map((hour) => ({ ...hour, ranges: hour.ranges.map((range) => ({ ...range })) }));
  }

  get holidays(): Holiday[] {
    return this.props.holidays.map((holiday) => ({ ...holiday, ranges: holiday.ranges.map((range) => ({ ...range })) }));
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
