import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import { Typography } from 'antd';
import request from '@/api/request';
import { useTranslation } from '@/i18n';
import { compileHook, evaluateFormula } from '@/utils/form-runtime';
import type { FormComponentProps } from '../types';

interface ExplainToken {
  label?: string;
  value?: string;
}

const OPERATOR_RE = /^[+\-*/()]+$/;

function tokenToExpression(token: unknown): string {
  if (token === null || token === undefined) return '';
  if (typeof token === 'object') {
    const raw = (token as ExplainToken).value;
    if (raw === undefined || raw === null || raw === '') return '';
    const text = String(raw);
    return OPERATOR_RE.test(text) ? text : ` formData.${text} `;
  }
  return String(token);
}

function tokenToText(token: unknown): string {
  if (token === null || token === undefined) return '';
  if (typeof token === 'object') {
    const label = (token as ExplainToken).label;
    return label ? ` ${label} ` : '';
  }
  return String(token);
}

function formatValue(raw: unknown, precision: number): number {
  const num = Number(raw);
  if (!Number.isFinite(num)) return 0;
  return Number(num.toFixed(Math.min(20, Math.max(0, precision))));
}

export const CalcFormula: FC<FormComponentProps> = ({
  config,
  mode,
  value,
  onChange,
  scope,
  index,
}) => {
  const { t } = useTranslation();
  const props = config.props || {};
  const explain: unknown[] = Array.isArray(props.explain) ? props.explain : [];
  const precision = Number(props.precision ?? 2) || 0;
  const prefix = props.prefix ? String(props.prefix) : '';
  const suffix = props.suffix ? String(props.suffix) : '';
  const isCustom = props.isCustom === true;
  const jsCode = typeof props.jsCode === 'string' ? props.jsCode : '';
  const values = scope.values;
  const explainKey = JSON.stringify(explain);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const apply = (raw: unknown) => {
      const next = formatValue(raw, precision);
      if (!Object.is(next, value)) onChange(next);
    };
    try {
      if (isCustom) {
        const exec = compileHook(['formData', 'index', 'request'], jsCode);
        const result = exec(values, index ?? 0, request);
        if (result instanceof Promise) {
          result
            .then((resolved) => {
              if (mountedRef.current) apply(resolved);
            })
            .catch(() => {
              if (mountedRef.current) apply(0);
            });
        } else {
          apply(result);
        }
      } else {
        const expression = explain.map(tokenToExpression).join('').trim();
        if (!expression) {
          apply(0);
        } else {
          apply(evaluateFormula(expression, values));
        }
      }
    } catch {
      apply(0);
    }
  }, [values, value, isCustom, jsCode, precision, index, explainKey]);

  const formulaText = explain
    .map(tokenToText)
    .join('')
    .replace(/\s+/g, ' ')
    .trim();

  if (mode === 'D') {
    return (
      <Typography.Text>
        {[prefix, isCustom ? t('form.component.calc.js') : formulaText || t('form.component.calc.setFormula'), suffix]
          .filter((part) => part !== '')
          .join(' ')}
      </Typography.Text>
    );
  }

  const displayValue = value === undefined || value === null || value === '' ? 0 : value;

  return (
    <Typography.Text>
      {[prefix, String(displayValue), suffix].filter((part) => part !== '').join(' ')}
    </Typography.Text>
  );
};

export default CalcFormula;
