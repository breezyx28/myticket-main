/**
 * Shared API types.
 *
 * The Postman collection that seeded this scaffold uses Laravel-style cursor /
 * length-aware paginators for list responses, and a `{ message: string }`
 * envelope for error bodies (`401 Unauthenticated.`, `404 No query results…`).
 *
 * Resource shapes are intentionally permissive — `[key: string]: unknown` is
 * mixed into known fields so backend additions don't break compilation while
 * the scaffold is in use. Tighten them as the real contracts are confirmed.
 */

export type Id = number | string;
export type Slug = string;
export type Iso8601 = string;

export interface ApiMessage {
  message: string;
}

export interface ApiValidationError extends ApiMessage {
  errors?: Record<string, string[]>;
}

export interface PaginationLink {
  url: string | null;
  label: string;
  page: number | null;
  active: boolean;
}

export interface Paginated<T> {
  current_page: number;
  data: T[];
  first_page_url: string | null;
  from: number | null;
  last_page: number;
  last_page_url: string | null;
  links: PaginationLink[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
}

export interface PaginationQuery {
  page?: number;
  per_page?: number;
}

export type Money = number;

export interface ResourceEnvelope<T> {
  data: T;
}
