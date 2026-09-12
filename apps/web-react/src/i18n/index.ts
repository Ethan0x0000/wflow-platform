import { useWflowStore } from '@/stores/wflow';
import zhCn from './langs/zh_cn';
import en from './langs/en';

export type Lang = 'zhCn' | 'en';

export const messages: Record<Lang, unknown> = { zhCn, en };

export const langOptions: Array<{ value: Lang; label: string }> = [
  { value: 'zhCn', label: '简体中文' },
  { value: 'en', label: 'English' },
];

function lookup(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, source);
}

/** Translate a dotted key, falling back to zhCn and then the raw key. */
export function translate(lang: Lang, key: string, fallback?: string): string {
  const value = lookup(messages[lang], key);
  if (typeof value === 'string') return value;
  const zh = lookup(messages.zhCn, key);
  if (typeof zh === 'string') return zh;
  return fallback ?? key;
}

/** Non-hook translator for module-level / event usage. */
export function t(key: string, fallback?: string): string {
  return translate((useWflowStore.getState().lang as Lang) || 'zhCn', key, fallback);
}

/** Reactive translator bound to the persisted language. */
export function useTranslation() {
  const lang = (useWflowStore((state) => state.lang) as Lang) || 'zhCn';
  const setLang = useWflowStore((state) => state.setLang);
  return {
    lang,
    setLang,
    t: (key: string, fallback?: string) => translate(lang, key, fallback),
  };
}
