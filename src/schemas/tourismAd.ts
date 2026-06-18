import * as yup from 'yup';
import type {
  TourismAdDayHours,
  TourismAdOpeningHours,
  TourismAdWeekday,
} from '@/api/types/tourismAd';
import type { ValidationTFunction } from '@/schemas/types';

export const TOURISM_AD_WEEKDAYS: TourismAdWeekday[] = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
];

export const TOURISM_AD_WEEKDAY_LABELS: Record<TourismAdWeekday, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

/** Localized weekday label via the `tourism` namespace (`tourism:weekdays.*`). */
export function tourismWeekdayLabel(
  t: (key: string) => string,
  day: TourismAdWeekday,
): string {
  return t(`weekdays.${day}`);
}

export const SAUDI_DEFAULT_LAT = 24.7136;
export const SAUDI_DEFAULT_LNG = 46.6753;

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Normalize browser time input (`HH:MM` or `HH:MM:SS`) to `HH:MM`. */
export function normalizeTimeValue(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const parts = value.trim().split(':');
  if (parts.length < 2) return undefined;
  const hh = parts[0].padStart(2, '0');
  const mm = parts[1].padStart(2, '0');
  return `${hh}:${mm}`;
}

export function defaultTourismAdOpeningHours(): TourismAdOpeningHours {
  const openDay: TourismAdDayHours = { closed: false, opens: '09:00', closes: '18:00' };
  return {
    mon: { ...openDay },
    tue: { ...openDay },
    wed: { ...openDay },
    thu: { ...openDay },
    fri: { closed: false, opens: '14:00', closes: '22:00' },
    sat: { closed: false, opens: '09:00', closes: '22:00' },
    sun: { closed: true },
  };
}

/** Strip times from closed days before API submit. */
export function normalizeOpeningHours(
  hours: TourismAdOpeningHours,
): TourismAdOpeningHours {
  const result = {} as TourismAdOpeningHours;
  for (const day of TOURISM_AD_WEEKDAYS) {
    const d = hours[day] ?? { closed: true };
    if (d.closed) {
      result[day] = { closed: true };
      continue;
    }
    const opens = normalizeTimeValue(d.opens) ?? '09:00';
    const closes = normalizeTimeValue(d.closes) ?? '18:00';
    result[day] = { closed: false, opens, closes };
  }
  return result;
}

export function validateOpeningHours(
  hours: TourismAdOpeningHours | undefined,
  t: ValidationTFunction,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!hours) {
    errors.opening_hours = t('tourism.openingHoursRequired');
    return errors;
  }

  let openDayCount = 0;
  for (const day of TOURISM_AD_WEEKDAYS) {
    const d = hours[day];
    if (!d || typeof d.closed !== 'boolean') {
      errors[`opening_hours.${day}`] = t('tourism.setHoursOrClosed');
      continue;
    }
    if (d.closed) continue;
    openDayCount += 1;
    const opens = normalizeTimeValue(d.opens);
    const closes = normalizeTimeValue(d.closes);
    if (!opens || !timePattern.test(opens)) {
      errors[`opening_hours.${day}.opens`] = t('tourism.openingTimeInvalid');
    }
    if (!closes || !timePattern.test(closes)) {
      errors[`opening_hours.${day}.closes`] = t('tourism.closingTimeInvalid');
    }
  }

  if (openDayCount === 0) {
    errors.opening_hours = t('tourism.atLeastOneDayOpen');
  }

  return errors;
}

function contactSchema(t: ValidationTFunction) {
  return yup
    .object({
      phone: yup.string().trim().notRequired(),
      email: yup
        .string()
        .trim()
        .transform((v) => (v === '' ? undefined : v))
        .email(t('tourism.emailInvalid'))
        .notRequired(),
      website: yup
        .string()
        .trim()
        .transform((v) => (v === '' ? undefined : v))
        .url(t('tourism.urlInvalid'))
        .notRequired(),
      whatsapp: yup.string().trim().notRequired(),
    })
    .test('phone-or-email', t('tourism.phoneOrEmailRequired'), (value) => {
      const phone = value?.phone?.trim();
      const email = value?.email?.trim();
      return Boolean(phone || email);
    });
}

function mediaLinkSchema(t: ValidationTFunction) {
  return yup.object({
    platform: yup.string().trim().min(1, t('tourism.platformRequired')).required(),
    url: yup.string().trim().url(t('tourism.urlInvalid')).required(),
  });
}

/** Step 1 — location & description (draft-friendly). */
export function createTourismAdLocationStepSchema(t: ValidationTFunction) {
  return yup.object({
    location_name: yup
      .string()
      .trim()
      .min(2, t('tourism.locationNameMin'))
      .required(t('tourism.locationNameRequired')),
    latitude: yup
      .number()
      .typeError(t('tourism.latitudeRequired'))
      .min(-90)
      .max(90)
      .required(t('tourism.latitudeRequired')),
    longitude: yup
      .number()
      .typeError(t('tourism.longitudeRequired'))
      .min(-180)
      .max(180)
      .required(t('tourism.longitudeRequired')),
    description: yup
      .string()
      .trim()
      .min(50, t('tourism.descriptionMin'))
      .max(5000, t('tourism.descriptionMax'))
      .required(t('tourism.descriptionRequired')),
  });
}

/** Step 2 — hours & services. */
export function createTourismAdHoursStepSchema(t: ValidationTFunction) {
  return yup.object({
    opening_hours: yup
      .mixed<TourismAdOpeningHours>()
      .required(t('tourism.openingHoursRequired'))
      .test('opening-hours', t('tourism.checkOpeningHours'), function (value) {
        const errors = validateOpeningHours(value as TourismAdOpeningHours, t);
        const keys = Object.keys(errors);
        if (keys.length === 0) return true;
        const first = keys[0];
        return this.createError({
          path: first,
          message: errors[first],
        });
      }),
    services: yup
      .array()
      .of(
        yup
          .string()
          .defined()
          .trim()
          .min(1, t('tourism.serviceNameEmpty'))
          .max(80, t('tourism.serviceNameMax')),
      )
      .min(1, t('tourism.addAtLeastOneService'))
      .max(20, t('tourism.maxServices'))
      .required(),
  });
}

/** Step 3 — contact & media links. */
export function createTourismAdContactStepSchema(t: ValidationTFunction) {
  return yup.object({
    contact: contactSchema(t).required(),
    media_links: yup.array().of(mediaLinkSchema(t)).max(10).default([]),
  });
}

/** Step 4 — gallery (submit requires min 1). */
export function createTourismAdGalleryStepSchema(t: ValidationTFunction) {
  return yup.object({
    gallery_urls: yup
      .array()
      .of(yup.string().trim().url().required())
      .min(1, t('tourism.uploadAtLeastOneImage'))
      .max(20, t('tourism.maxGalleryImages'))
      .required(),
  });
}

/** Full publish rules (used before API submit). */
export function createTourismAdSubmitSchema(t: ValidationTFunction) {
  return createTourismAdLocationStepSchema(t)
    .concat(createTourismAdHoursStepSchema(t))
    .concat(createTourismAdContactStepSchema(t))
    .concat(createTourismAdGalleryStepSchema(t));
}

export type TourismAdFormValues = yup.InferType<ReturnType<typeof createTourismAdSubmitSchema>>;

export const EMPTY_TOURISM_AD_FORM: TourismAdFormValues = {
  location_name: '',
  latitude: SAUDI_DEFAULT_LAT,
  longitude: SAUDI_DEFAULT_LNG,
  description: '',
  opening_hours: defaultTourismAdOpeningHours(),
  services: [],
  contact: { phone: '', email: '', website: '', whatsapp: '' },
  media_links: [],
  gallery_urls: [],
};
