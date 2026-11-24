export interface BookingSettingsProps {
  slotGranularityMin: number;
  minAdvanceMin: number;
  maxDays: number;
  defaultBufferMin: number;
  cancelBeforeHours: number;
  rescheduleBeforeHours: number;
  maxReschedules: number;
  autoConfirm: boolean;
  maxFutureAppointments: number;
}

export type StoredBookingSettings = Partial<BookingSettingsProps>;

export const DEFAULT_BOOKING_SETTINGS: BookingSettingsProps = {
  slotGranularityMin: 15,
  minAdvanceMin: 60,
  maxDays: 45,
  defaultBufferMin: 0,
  cancelBeforeHours: 4,
  rescheduleBeforeHours: 4,
  maxReschedules: 2,
  autoConfirm: true,
  maxFutureAppointments: 3,
};

export class BookingSettings {
  private constructor(private readonly props: BookingSettingsProps) {}

  static defaults(): BookingSettings {
    return BookingSettings.restore();
  }

  /** Campos ausentes no JSON salvo voltam ao padrão. */
  static restore(stored: StoredBookingSettings = {}): BookingSettings {
    const d = DEFAULT_BOOKING_SETTINGS;

    return new BookingSettings({
      slotGranularityMin: stored.slotGranularityMin ?? d.slotGranularityMin,
      minAdvanceMin: stored.minAdvanceMin ?? d.minAdvanceMin,
      maxDays: stored.maxDays ?? d.maxDays,
      defaultBufferMin: stored.defaultBufferMin ?? d.defaultBufferMin,
      cancelBeforeHours: stored.cancelBeforeHours ?? d.cancelBeforeHours,
      rescheduleBeforeHours: stored.rescheduleBeforeHours ?? d.rescheduleBeforeHours,
      maxReschedules: stored.maxReschedules ?? d.maxReschedules,
      autoConfirm: stored.autoConfirm ?? d.autoConfirm,
      maxFutureAppointments: stored.maxFutureAppointments ?? d.maxFutureAppointments,
    });
  }

  get values(): BookingSettingsProps {
    return { ...this.props };
  }
}
