import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Empty, Image, Input, Popconfirm, Popover, Spin, Typography, message } from 'antd';
import { ReloadOutlined, SendOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { addInstDiscuss, delInstDiscuss, getInstDiscuss } from '@/api/instance';
import { searchOrgs } from '@/api/org';
import { useTranslation } from '@/i18n';
import { useWflowStore } from '@/stores/wflow';
import { WAvatar } from './WAvatar';
import { WResUpload, type ResFile } from './WResUpload';
import { downloadResUrl, resUrl } from '@/utils/resource';
import type { OrgUser } from '@/types/workflow';

const REVOKE_TIMEOUT_MS = 120_000;

export interface DiscussAtUser {
  id: string;
  name: string;
}

export interface ProcessInstDiscussProps {
  instId: string;
  showDiscuss?: boolean;
  enableDiscuss?: boolean;
  admin?: boolean;
}

function formatSize(size?: number): string {
  if (size === undefined || size === null) return '';
  if (size > 1048576) return `${(size / 1048576).toFixed(1)}MB`;
  if (size > 1024) return `${(size / 1024).toFixed(1)}KB`;
  return `${size}B`;
}

function formatTime(value?: string): string {
  if (!value) return '';
  const date = dayjs(value);
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm') : value;
}

export const ProcessInstDiscuss: React.FC<ProcessInstDiscussProps> = ({
  instId,
  showDiscuss,
  enableDiscuss = true,
  admin = false,
}) => {
  const { t } = useTranslation();
  const loginUser = useWflowStore((state) => state.loginUser);
  const [records, setRecords] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageNoRef = useRef(0);
  const pageSize = 10;

  const [text, setText] = useState('');
  const [atUsers, setAtUsers] = useState<DiscussAtUser[]>([]);
  const [images, setImages] = useState<ResFile[]>([]);
  const [files, setFiles] = useState<ResFile[]>([]);
  const [atOpen, setAtOpen] = useState(false);
  const [atLoading, setAtLoading] = useState(false);
  const [atList, setAtList] = useState<OrgUser[]>([]);
  const taRef = useRef<any>(null);
  const searchTimer = useRef<number | undefined>(undefined);

  const load = useCallback(
    async (pageNo: number, append = false) => {
      if (!instId) return;
      if (append) setLoadingMore(true);
      else setLoading(true);
      try {
        const res = await getInstDiscuss({ instId, pageNo, pageSize } as any);
        const data = res?.data || {};
        const next: any[] = Array.isArray(data.records) ? data.records : [];
        setRecords((prev) => (append ? [...prev, ...next] : next));
        setTotal(Number(data.total ?? next.length));
        pageNoRef.current = pageNo;
      } catch (err: any) {
        message.error(err?.msg || t('workspace.discuss.loadFailed'));
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [instId]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const reloadAll = useCallback(async () => {
    const pages = Math.max(1, pageNoRef.current);
    setLoading(true);
    try {
      const responses = await Promise.all(
        Array.from({ length: pages }, (_, index) => getInstDiscuss({ instId, pageNo: index + 1, pageSize } as any))
      );
      const merged = responses.flatMap((res) => (Array.isArray(res?.data?.records) ? res.data.records : []));
      setRecords(merged);
      setTotal(Number(responses[0]?.data?.total ?? merged.length));
    } catch (err: any) {
      message.error(err?.msg || t('workspace.discuss.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [instId]);

  const searchAt = (keyword: string) => {
    window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(async () => {
      setAtLoading(true);
      try {
        const res = await searchOrgs(keyword);
        setAtList(Array.isArray(res.data) ? res.data : []);
      } catch {
        setAtList([]);
      } finally {
        setAtLoading(false);
      }
    }, 250);
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setText(value);
    setAtUsers((prev) => prev.filter((user) => value.includes(`@${user.name}`)));
    const cursor = event.target.selectionStart ?? value.length;
    const matched = /@([^@\s]*)$/.exec(value.slice(0, cursor));
    if (matched) {
      setAtOpen(true);
      searchAt(matched[1]);
    } else {
      setAtOpen(false);
    }
  };

  const selectAtUser = (user: OrgUser) => {
    const ta: HTMLTextAreaElement | undefined = taRef.current?.resizableTextArea?.textArea;
    const cursor = ta?.selectionStart ?? text.length;
    const before = text.slice(0, cursor).replace(/@([^@\s]*)$/, `@${user.name} `);
    const next = before + text.slice(cursor);
    setText(next);
    setAtUsers((prev) => (prev.some((item) => item.id === user.id) ? prev : [...prev, { id: user.id, name: user.name }]));
    setAtOpen(false);
    requestAnimationFrame(() => {
      ta?.focus();
      ta?.setSelectionRange(before.length, before.length);
    });
  };

  const send = async () => {
    if (!text.trim() && images.length === 0 && files.length === 0) {
      message.warning(t('workspace.discuss.emptyMessage'));
      return;
    }
    try {
      await addInstDiscuss(instId, { text, images, files, atUsers });
      message.success(t('workspace.discuss.sendSuccess'));
      setText('');
      setAtUsers([]);
      setImages([]);
      setFiles([]);
      setAtOpen(false);
      reloadAll();
    } catch (err: any) {
      message.error(err?.msg || t('workspace.discuss.sendFailed'));
    }
  };

  const withdraw = async (id: string) => {
    try {
      await delInstDiscuss(id);
      message.success(t('workspace.discuss.withdrawSuccess'));
      reloadAll();
    } catch (err: any) {
      message.error(err?.msg || t('workspace.discuss.withdrawFailed'));
    }
  };

  const atContent = (
    <div style={{ minWidth: 180, maxHeight: 240, overflowY: 'auto' }}>
      {atLoading ? (
        <div style={{ textAlign: 'center', padding: 8 }}>
          <Spin size="small" />
        </div>
      ) : atList.length === 0 ? (
        <Typography.Text type="secondary">{t('workspace.discuss.noUsers')}</Typography.Text>
      ) : (
        atList.map((user) => (
          <div
            key={user.id}
            onClick={() => selectAtUser(user)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', cursor: 'pointer' }}
          >
            <WAvatar id={user.id} name={user.name} src={user.avatar} size={24} />
            <span>{user.name}</span>
          </div>
        ))
      )}
    </div>
  );

  if (showDiscuss === false) return null;

  const renderMessage = (msg: any) => {
    const owner: OrgUser = msg.owner || {};
    const mine = !!loginUser?.id && loginUser.id === owner.id;
    const content = msg.content || {};
    const canWithdraw =
      (mine || admin) &&
      (!msg.createTime || Date.now() - Date.parse(msg.createTime) <= REVOKE_TIMEOUT_MS);
    const msgImages: ResFile[] = Array.isArray(content.images) ? content.images : [];
    const msgFiles: ResFile[] = Array.isArray(content.files) ? content.files : [];
    return (
      <div
        key={msg.id}
        style={{
          display: 'flex',
          flexDirection: mine ? 'row-reverse' : 'row',
          alignItems: 'flex-start',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <WAvatar id={owner.id} name={owner.name} src={owner.avatar} size={36} />
        <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: mine ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
            <Typography.Text strong style={{ fontSize: 13 }}>
              {owner.name}
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {formatTime(msg.createTime)}
            </Typography.Text>
          </div>
          <div
            style={{
              marginTop: 4,
              padding: '8px 10px',
              borderRadius: 8,
              background: mine ? '#1677ff' : '#f5f5f5',
              color: mine ? '#fff' : undefined,
              wordBreak: 'break-word',
            }}
          >
            {canWithdraw && (
              <Popconfirm title={t('workspace.discuss.withdrawConfirm')} onConfirm={() => withdraw(msg.id)}>
                <Button size="small" type="text" icon={<ReloadOutlined />} style={{ color: mine ? '#fff' : undefined }} />
              </Popconfirm>
            )}
            {content.text && <div>{content.text}</div>}
            {msgImages.length > 0 && (
              <Image.PreviewGroup>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                  {msgImages.map((img, index) => (
                    <Image
                      key={img.id || index}
                      src={resUrl(img.url, { zip: 'true' })}
                      preview={{ src: resUrl(img.url) }}
                      width={80}
                      height={60}
                      style={{ objectFit: 'cover', borderRadius: 5 }}
                    />
                  ))}
                </div>
              </Image.PreviewGroup>
            )}
            {msgFiles.length > 0 && (
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {msgFiles.map((file, index) => (
                  <a
                    key={file.id || index}
                    href={downloadResUrl(file.url, file.name)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: mine ? '#fff' : undefined, textDecoration: 'underline' }}
                  >
                    {file.name} {formatSize(file.size) && <span style={{ fontSize: 12 }}>({formatSize(file.size)})</span>}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div style={{ minHeight: 120, maxHeight: 'calc(100vh - 320px)', overflowY: 'auto', padding: '0 4px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Spin />
          </div>
        ) : records.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={enableDiscuss ? t('workspace.discuss.empty') : t('workspace.discuss.closed')}
          />
        ) : (
          records.map(renderMessage)
        )}
        {records.length < total && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <Button size="small" loading={loadingMore} onClick={() => load(pageNoRef.current + 1, true)}>
              {t('workspace.discuss.loadMore')}
            </Button>
          </div>
        )}
      </div>
      {enableDiscuss ? (
        <div style={{ marginTop: 8 }}>
          <Popover
            open={atOpen}
            content={atContent}
            placement="topLeft"
            onOpenChange={(open) => setAtOpen(open)}
          >
            <Input.TextArea
              ref={taRef}
              value={text}
              onChange={handleTextChange}
              rows={3}
              maxLength={250}
              showCount
              placeholder={t('workspace.discuss.placeholder')}
            />
          </Popover>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, gap: 8 }}>
            <WResUpload
              value={{ images, files }}
              onChange={(next) => {
                setImages(next.images || []);
                setFiles(next.files || []);
              }}
              compact
            />
            <Button type="primary" size="small" icon={<SendOutlined />} onClick={send}>
              {t('workspace.discuss.send')}
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 8, textAlign: 'center' }}>
          <Typography.Text type="secondary">{t('workspace.discuss.closed')}</Typography.Text>
        </div>
      )}
    </div>
  );
};

export default ProcessInstDiscuss;
