import type { BookingSettings, BookingSettingsProps } from '@/modules/settings/domain/entities/BookingSettings';

export type GetBookingSettingsResponseDTO = BookingSettingsProps;

export function toGetBookingSettingsResponse(settings: BookingSettings): GetBookingSettingsResponseDTO {
  return settings.values;
}
