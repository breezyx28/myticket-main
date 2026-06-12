import * as yup from 'yup';
import type {
  TourismAdDayHours,
  TourismAdOpeningHours,
  TourismAdWeekday,
} from '@/api/types/tourismAd';

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
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!hours) {
    errors.opening_hours = 'Opening hours are required.';
    return errors;
  }

  let openDayCount = 0;
  for (const day of TOURISM_AD_WEEKDAYS) {
    const d = hours[day];
    if (!d || typeof d.closed !== 'boolean') {
      errors[`opening_hours.${day}`] = 'Set hours or mark as closed.';
      continue;
    }
    if (d.closed) continue;
    openDayCount += 1;
    const opens = normalizeTimeValue(d.opens);
    const closes = normalizeTimeValue(d.closes);
    if (!opens || !timePattern.test(opens)) {
      errors[`opening_hours.${day}.opens`] = 'Enter a valid opening time.';
    }
    if (!closes || !timePattern.test(closes)) {
      errors[`opening_hours.${day}.closes`] = 'Enter a valid closing time.';
    }
  }

  if (openDayCount === 0) {
    errors.opening_hours = 'At least one day must be open.';
  }

  return errors;
}

const contactSchema = yup
  .object({
    phone: yup.string().trim().notRequired(),
    email: yup
      .string()
      .trim()
      .transform((v) => (v === '' ? undefined : v))
      .email('Enter a valid email.')
      .notRequired(),
    website: yup
      .string()
      .trim()
      .transform((v) => (v === '' ? undefined : v))
      .url('Enter a valid URL.')
      .notRequired(),
    whatsapp: yup.string().trim().notRequired(),
  })
  .test(
    'phone-or-email',
    'Provide at least a phone number or email.',
    (value) => {
      const phone = value?.phone?.trim();
      const email = value?.email?.trim();
      return Boolean(phone || email);
    },
  );

const mediaLinkSchema = yup.object({
  platform: yup.string().trim().min(1, 'Platform is required.').required(),
  url: yup.string().trim().url('Enter a valid URL.').required(),
});

/** Step 1 — location & description (draft-friendly). */
export const tourismAdLocationStepSchema = yup.object({
  location_name: yup
    .string()
    .trim()
    .min(2, 'Location name must be at least 2 characters.')
    .required('Location name is required.'),
  latitude: yup
    .number()
    .typeError('Latitude is required.')
    .min(-90)
    .max(90)
    .required('Latitude is required.'),
  longitude: yup
    .number()
    .typeError('Longitude is required.')
    .min(-180)
    .max(180)
    .required('Longitude is required.'),
  description: yup
    .string()
    .trim()
    .min(50, 'Description must be at least 50 characters.')
    .max(5000, 'Description must be at most 5000 characters.')
    .required('Description is required.'),
});

/** Step 2 — hours & services. */
export const tourismAdHoursStepSchema = yup.object({
  opening_hours: yup
    .mixed<TourismAdOpeningHours>()
    .required('Opening hours are required.')
    .test('opening-hours', 'Check opening hours.', function (value) {
      const errors = validateOpeningHours(value as TourismAdOpeningHours);
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
        .min(1, 'Service name cannot be empty.')
        .max(80, 'Each service must be at most 80 characters.'),
    )
    .min(1, 'Add at least one service.')
    .max(20, 'At most 20 services.')
    .required(),
});

/** Step 3 — contact & media links. */
export const tourismAdContactStepSchema = yup.object({
  contact: contactSchema.required(),
  media_links: yup.array().of(mediaLinkSchema).max(10).default([]),
});

/** Step 4 — gallery (submit requires min 1). */
export const tourismAdGalleryStepSchema = yup.object({
  gallery_urls: yup
    .array()
    .of(yup.string().trim().url().required())
    .min(1, 'Upload at least one gallery image.')
    .max(20, 'At most 20 gallery images.')
    .required(),
});

/** Full publish rules (used before API submit). */
export const tourismAdSubmitSchema = tourismAdLocationStepSchema
  .concat(tourismAdHoursStepSchema)
  .concat(tourismAdContactStepSchema)
  .concat(tourismAdGalleryStepSchema);

export type TourismAdFormValues = yup.InferType<typeof tourismAdSubmitSchema>;

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
