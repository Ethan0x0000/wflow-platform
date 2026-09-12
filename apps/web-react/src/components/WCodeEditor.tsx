import React, { useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { html } from '@codemirror/lang-html';
import { oneDark } from '@codemirror/theme-one-dark';
import { Tooltip, Typography } from 'antd';
import { QuestionCircleFilled } from '@ant-design/icons';
import { useWflowStore } from '@/stores/wflow';

export type CodeLang = 'javascript' | 'json' | 'html' | 'vue' | 'base';

export interface WCodeEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  lang?: CodeLang;
  readOnly?: boolean;
  height?: string | number;
  prefix?: React.ReactNode;
  prefixTip?: React.ReactNode;
  placeholder?: string;
  /** Follow the global dark mode; defaults to true. */
  autoTheme?: boolean;
}

function extensionsFor(lang: CodeLang) {
  switch (lang) {
    case 'json':
      return [json()];
    case 'html':
    case 'vue':
      return [html()];
    case 'javascript':
    case 'base':
    default:
      return [javascript()];
  }
}

export const WCodeEditor: React.FC<WCodeEditorProps> = ({
  value,
  onChange,
  lang = 'javascript',
  readOnly = false,
  height = 200,
  prefix,
  prefixTip,
  placeholder,
  autoTheme = true,
}) => {
  const mode = useWflowStore((state) => state.theme);
  const dark = autoTheme ? mode === 'dark' : false;
  const extensions = useMemo(
    () => [extensionsFor(lang), EditorView.lineWrapping],
    [lang]
  );

  return (
    <div className="w-code-editor">
      {prefix && (
        <div className="w-code-editor-prefix">
          <Typography.Text type="secondary">{prefix}</Typography.Text>
          {prefixTip && (
            <Tooltip title={prefixTip}>
              <QuestionCircleFilled style={{ marginLeft: 6, cursor: 'help' }} />
            </Tooltip>
          )}
        </div>
      )}
      <CodeMirror
        value={value ?? ''}
        height={typeof height === 'number' ? `${height}px` : height}
        placeholder={placeholder}
        theme={dark ? oneDark : 'light'}
        extensions={extensions}
        editable={!readOnly}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: false,
          tabSize: 2,
        }}
        onChange={(next) => onChange?.(next)}
      />
    </div>
  );
};

export default WCodeEditor;
