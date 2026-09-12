import type React from 'react';
import type { CanvasEditorConfig } from '../printConfig';

export interface PrintDesignerHandle {
  getValue: () => CanvasEditorConfig | null;
}

export interface CustomPrintDesignerProps {
  readonly?: boolean;
  showTools?: boolean;
  config?: CanvasEditorConfig;
  formFields: any[];
}

export interface IconBtnProps {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}

/** Typed façade over `editor.command.*`; extra args are forwarded positionally. */
export type PrintCmd = (fn: string, ...args: any[]) => void;

export interface SearchFlags {
  caseSensitive: boolean;
  regex: boolean;
}

export interface SearchInfo {
  index: number;
  count: number;
}
