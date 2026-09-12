import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/i18n';

export interface ExpVariable {
  label: string;
  value: string;
}

export interface WExpInputProps {
  value?: string;
  onChange?: (text: string) => void;
  variables?: ExpVariable[];
  placeholder?: string;
  minHeight?: number;
  disabled?: boolean;
}

const DEFAULT_VARIABLES: ExpVariable[] = [
  { label: '姓名', value: 'name' },
  { label: '年龄', value: 'age' },
  { label: '性别', value: 'sex' },
];

/** Serialize the editable DOM to text, turning variable tags into `{value}` tokens. */
function serialize(root: HTMLElement | null): string {
  if (!root) return '';
  let text = '';
  root.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent || '';
    } else if (node instanceof HTMLElement) {
      if (node.classList.contains('variable-tag')) text += node.dataset.value || node.textContent;
      else text += serialize(node);
    }
  });
  return text.replace(/\u200B/g, '');
}

export const WExpInput: React.FC<WExpInputProps> = ({
  value,
  onChange,
  variables = DEFAULT_VARIABLES,
  placeholder,
  minHeight = 40,
  disabled = false,
}) => {
  const { t } = useTranslation();
  const resolvedPlaceholder = placeholder ?? t('workspace.condition.expPlaceholder');
  const editorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const [showVariables, setShowVariables] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{ left: number; top: number }>({
    left: 0,
    top: 0,
  });

  useEffect(() => {
    if (!initialized.current && editorRef.current && value) {
      editorRef.current.textContent = value;
      initialized.current = true;
    }
  }, [value]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !editorRef.current?.contains(target) &&
        (!panelRef.current || !panelRef.current.contains(target))
      ) {
        setShowVariables(false);
      }
    };
    document.addEventListener('click', onDocumentClick);
    return () => document.removeEventListener('click', onDocumentClick);
  }, []);

  const updatePanelPosition = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    setPanelPosition({ left: rect.left + window.scrollX, top: rect.bottom + window.scrollY + 2 });
  };

  const emit = () => onChange?.(serialize(editorRef.current));

  const handleInput = () => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const node = selection.anchorNode;
    const text = node?.textContent || '';
    const offset = selection.anchorOffset;
    if (text[offset - 1] === '/') {
      setShowVariables(true);
      updatePanelPosition();
    } else if (showVariables) {
      updatePanelPosition();
    }
    emit();
  };

  const insertVariable = (item: ExpVariable) => {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (selection.anchorNode) {
      range.setStart(selection.anchorNode, Math.max(0, selection.anchorOffset - 1));
    }
    range.deleteContents();

    const tag = document.createElement('span');
    tag.className = 'variable-tag';
    tag.contentEditable = 'false';
    tag.dataset.value = item.value;
    tag.textContent = item.label;
    range.insertNode(tag);
    range.insertNode(document.createTextNode('\u200B'));

    const next = document.createRange();
    next.setStartAfter(tag);
    next.collapse(true);
    selection.removeAllRanges();
    selection.addRange(next);

    setShowVariables(false);
    emit();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === ' ' && showVariables) {
      setShowVariables(false);
      event.preventDefault();
    }
    if (['ArrowUp', 'ArrowDown'].includes(event.key) && showVariables) event.preventDefault();
  };

  return (
    <div className="w-exp-input" style={{ position: 'relative' }}>
      <div
        ref={editorRef}
        className="w-exp-editor"
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={resolvedPlaceholder}
        style={{ minHeight }}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onClick={() => showVariables && updatePanelPosition()}
      />
      {showVariables && (
        <div
          ref={panelRef}
          className="w-exp-panel"
          style={{ left: panelPosition.left, top: panelPosition.top }}
        >
          {variables.map((item, index) => (
            <div
              key={index}
              className="w-exp-item"
              onMouseDown={(event) => {
                event.preventDefault();
                insertVariable(item);
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WExpInput;
