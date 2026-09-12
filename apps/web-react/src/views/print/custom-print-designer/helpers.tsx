import React from 'react';

export const FONT_FAMILY_ITEM = (value: string, label: string) => ({ key: value, label: <span style={{ fontFamily: value }}>{label}</span> });

/** Replace `{name}` placeholders in a translated template. */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}
