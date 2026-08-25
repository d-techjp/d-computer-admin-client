/**
 * Thông tin cửa hàng (footer storefront) — singleton, phía admin (tag
 * `Admin - Site Settings`). Không có `id`: `GET`/`PATCH /site-settings` (dưới
 * base URL đã có sẵn tiền tố `/admin`) luôn thao tác trên đúng một bản ghi.
 *
 * Endpoint public `GET /site-settings` (không tiền tố `admin`) không có ở đây
 * — đó là API cho storefront tự gọi, admin có đường riêng.
 */
import type { FooterColumn, FooterLink, SiteSettings, SocialLink } from "@/types/siteSettings";

import { apiFetch } from "./client";
import { compactPayload } from "./pagination";
import { asArray, asRecord, asString } from "./parse";

export interface SocialLinkPayload {
  id?: string;
  name: string;
  logoUrl: string;
  url: string;
}

export interface FooterLinkPayload {
  id?: string;
  label: string;
  url: string;
}

export interface FooterColumnPayload {
  id?: string;
  title: string;
  links: FooterLinkPayload[];
}

export interface SiteSettingsPayload {
  companyName?: string;
  phone?: string;
  address?: string;
  socialLinks?: SocialLinkPayload[];
  footerColumns?: FooterColumnPayload[];
}

function toSocialLink(value: unknown): SocialLink {
  const record = asRecord(value);
  return {
    id: asString(record.id) || undefined,
    name: asString(record.name),
    logoUrl: asString(record.logoUrl),
    url: asString(record.url),
  };
}

function toFooterLink(value: unknown): FooterLink {
  const record = asRecord(value);
  return {
    id: asString(record.id) || undefined,
    label: asString(record.label),
    url: asString(record.url),
  };
}

function toFooterColumn(value: unknown): FooterColumn {
  const record = asRecord(value);
  return {
    id: asString(record.id) || undefined,
    title: asString(record.title),
    links: asArray(record.links).map(toFooterLink),
  };
}

export function toSiteSettings(value: unknown): SiteSettings {
  const record = asRecord(value);
  return {
    companyName: asString(record.companyName),
    phone: asString(record.phone),
    address: asString(record.address),
    socialLinks: asArray(record.socialLinks).map(toSocialLink),
    footerColumns: asArray(record.footerColumns).map(toFooterColumn),
  };
}

export function fetchSiteSettings() {
  return apiFetch<unknown>("/site-settings").then(toSiteSettings);
}

export function updateSiteSettings(payload: SiteSettingsPayload) {
  return apiFetch<unknown>("/site-settings", {
    method: "PATCH",
    body: compactPayload(payload),
  }).then(toSiteSettings);
}
