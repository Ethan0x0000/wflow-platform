import type { FC, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Dropdown, Select, Space, Tooltip, Typography, message, theme } from 'antd';
import {
  BlockOutlined,
  BoldOutlined,
  ClearOutlined,
  ItalicOutlined,
  LinkOutlined,
  OrderedListOutlined,
  PictureOutlined,
  RedoOutlined,
  StrikethroughOutlined,
  UnderlineOutlined,
  UndoOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import DOMPurify from 'dompurify';
import request from '@/api/request';
import { useTranslation } from '@/i18n';
import { resUrl } from '@/utils/resource';
import { useDefaultValue } from '../runtime';
import type { FormComponentProps } from '../types';
import './rich-text.css';

const HEADING_OPTIONS = [
  { labelKey: 'form.component.richText.headingText', value: 'p' },
  { labelKey: 'form.component.richText.heading', level: 1, value: 'h1' },
  { labelKey: 'form.component.richText.heading', level: 2, value: 'h2' },
  { labelKey: 'form.component.richText.heading', level: 3, value: 'h3' },
  { labelKey: 'form.component.richText.heading', level: 4, value: 'h4' },
  { labelKey: 'form.component.richText.heading', level: 5, value: 'h5' },
];

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

function isBlankHtml(html: string): boolean {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim() === '';
}

function normalizeHtml(html: string): string {
  return isBlankHtml(html) ? '' : html;
}

/**
 * 富文本编辑器（TipTap），对齐 Vue wangEditor 版本的组件契约：
 * value 为 HTML 字符串，onChange 回传清洗后的 HTML；工具条移植加粗/斜体/下划线/删除线/
 * 标题/引用/列表/链接/图片/撤销/重做/清除格式。输入输出均经 DOMPurify 清洗。
 */
export const RichText: FC<FormComponentProps> = ({ config, mode, value, onChange }) => {
  const { t } = useTranslation();
  const props = config.props || {};
  const placeholder = props.placeholder || t('form.component.richText.placeholder');
  const maxHeight = props.maxHeight;
  const html = typeof value === 'string' ? value : '';
  const editable = mode === 'E' || mode === 'D';
  const { token } = theme.useToken();
  const imageFileRef = useRef<HTMLInputElement | null>(null);
  const onChangeRef = useRef(onChange);
  const lastSyncedRef = useRef<string | null>(null);
  const [empty, setEmpty] = useState(() => isBlankHtml(html));

  onChangeRef.current = onChange;

  useDefaultValue(config, mode, value, onChange);

  const extensions = useMemo(
    () => [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
      }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
    []
  );

  const editor = useEditor({
    extensions,
    content: sanitizeHtml(html),
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => {
      const clean = normalizeHtml(sanitizeHtml(current.getHTML()));
      lastSyncedRef.current = clean;
      setEmpty(clean === '');
      onChangeRef.current(clean);
    },
  });

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  useEffect(() => {
    if (!editor) return;
    const clean = normalizeHtml(sanitizeHtml(html));
    const current = normalizeHtml(sanitizeHtml(editor.getHTML()));
    if (clean === current) {
      lastSyncedRef.current = html;
      setEmpty(clean === '');
      return;
    }
    if (lastSyncedRef.current === html) return;
    lastSyncedRef.current = html;
    editor.commands.setContent(sanitizeHtml(html), false);
    setEmpty(clean === '');
  }, [editor, html]);

  const sanitizedHtml = useMemo(() => sanitizeHtml(html), [html]);

  const handleLink = () => {
    if (!editor) return;
    const previous = (editor.getAttributes('link').href as string | undefined) || '';
    const input = window.prompt(t('form.component.richText.linkPrompt'), previous);
    if (input === null) return;
    const href = input.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  };

  const handleImageUrl = () => {
    const input = window.prompt(t('form.component.richText.imageUrlPrompt'));
    const src = input?.trim();
    if (!src) return;
    editor?.chain().focus().setImage({ src }).run();
  };

  const handleImageFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      message.warning(t('form.component.richText.chooseImage'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      message.warning(t('form.component.richText.imageTooLarge'));
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    formData.append('isImg', 'true');
    try {
      const res = await request<{ url?: string; name?: string }>({ url: '/res', method: 'post', data: formData });
      const data = res?.data;
      if (data?.url) {
        editor?.chain().focus().setImage({ src: resUrl(data.url), alt: data.name }).run();
      } else {
        message.error(res?.msg || t('form.component.richText.imageUploadFailed'));
      }
    } catch (error: any) {
      message.error(error?.msg || t('form.component.richText.imageUploadFailed'));
    }
  };

  if (!editable) {
    if (isBlankHtml(html)) return <Typography.Text type="secondary">-</Typography.Text>;
    return <div style={{ lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
  }

  const toolbarButton = (
    title: string,
    icon: ReactNode,
    onPress: () => void,
    options: { active?: boolean; disabled?: boolean } = {}
  ) => (
    <Tooltip title={title}>
      <Button
        size="small"
        type="text"
        icon={icon}
        disabled={options.disabled}
        style={
          options.active
            ? { color: token.colorPrimary, background: token.colorFillSecondary }
            : undefined
        }
        onMouseDown={(event) => event.preventDefault()}
        onClick={onPress}
      />
    </Tooltip>
  );

  const headingLevel = [1, 2, 3, 4, 5].find((level) => editor?.isActive('heading', { level }));

  return (
    <div className="w-rich-text">
      <div
        style={{
          border: `1px solid ${token.colorBorder}`,
          borderRadius: token.borderRadius,
          background: token.colorBgContainer,
          overflow: 'hidden',
        }}
      >
        <Space
          size={0}
          wrap
          className="w-rich-text-toolbar"
          style={{ borderBottom: `1px solid ${token.colorBorder}` }}
        >
          <Select
            size="small"
            style={{ width: 82, marginRight: 4 }}
            value={headingLevel ? `h${headingLevel}` : 'p'}
            options={HEADING_OPTIONS.map((opt) => ({
              label: opt.level ? t(opt.labelKey).replace('{level}', String(opt.level)) : t(opt.labelKey),
              value: opt.value,
            }))}
            onChange={(next) => {
              if (!editor) return;
              if (next === 'p') editor.chain().focus().setParagraph().run();
              else editor.chain().focus().setHeading({ level: Number(next.slice(1)) as 1 | 2 | 3 | 4 | 5 }).run();
            }}
          />
          {toolbarButton(t('form.component.richText.bold'), <BoldOutlined />, () => editor?.chain().focus().toggleBold().run(), {
            active: editor?.isActive('bold'),
          })}
          {toolbarButton(t('form.component.richText.italic'), <ItalicOutlined />, () => editor?.chain().focus().toggleItalic().run(), {
            active: editor?.isActive('italic'),
          })}
          {toolbarButton(t('form.component.richText.underline'), <UnderlineOutlined />, () => editor?.chain().focus().toggleUnderline().run(), {
            active: editor?.isActive('underline'),
          })}
          {toolbarButton(t('form.component.richText.strike'), <StrikethroughOutlined />, () => editor?.chain().focus().toggleStrike().run(), {
            active: editor?.isActive('strike'),
          })}
          {toolbarButton(t('form.component.richText.quote'), <BlockOutlined />, () => editor?.chain().focus().toggleBlockquote().run(), {
            active: editor?.isActive('blockquote'),
          })}
          {toolbarButton(t('form.component.richText.bulletList'), <UnorderedListOutlined />, () => editor?.chain().focus().toggleBulletList().run(), {
            active: editor?.isActive('bulletList'),
          })}
          {toolbarButton(t('form.component.richText.orderedList'), <OrderedListOutlined />, () => editor?.chain().focus().toggleOrderedList().run(), {
            active: editor?.isActive('orderedList'),
          })}
          {toolbarButton(t('form.component.richText.insertLink'), <LinkOutlined />, handleLink, { active: editor?.isActive('link') })}
          <Dropdown
            menu={{
              items: [
                { key: 'url', label: t('form.component.richText.insertImageUrl') },
                { key: 'upload', label: t('form.component.richText.uploadImage') },
              ],
              onClick: ({ key }) => {
                if (key === 'url') handleImageUrl();
                else imageFileRef.current?.click();
              },
            }}
            trigger={['click']}
          >
            <Button size="small" type="text" icon={<PictureOutlined />} onMouseDown={(event) => event.preventDefault()} />
          </Dropdown>
          {toolbarButton(t('form.component.richText.undo'), <UndoOutlined />, () => editor?.chain().focus().undo().run(), {
            disabled: !editor?.can().undo(),
          })}
          {toolbarButton(t('form.component.richText.redo'), <RedoOutlined />, () => editor?.chain().focus().redo().run(), {
            disabled: !editor?.can().redo(),
          })}
          {toolbarButton(t('form.component.richText.clearFormat'), <ClearOutlined />, () =>
            editor?.chain().focus().clearNodes().unsetAllMarks().run()
          )}
        </Space>
        <div className="w-rich-text-body">
          <div
            className="w-rich-text-editor"
            style={{
              maxHeight: maxHeight ? (typeof maxHeight === 'number' ? `${maxHeight}px` : String(maxHeight)) : undefined,
            }}
          >
            <EditorContent editor={editor} />
          </div>
          {empty ? (
            <span className="w-rich-text-placeholder" style={{ color: token.colorTextPlaceholder }}>
              {placeholder}
            </span>
          ) : null}
        </div>
      </div>
      <input
        ref={imageFileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageFile}
      />
    </div>
  );
};

export default RichText;
