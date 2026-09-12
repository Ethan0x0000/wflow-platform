import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Button,
  Space,
  Tag,
  Typography,
  Row,
  Col,
  Modal,
  Input,
  message,
  Popconfirm,
  Spin,
  Empty,
  Badge,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  SearchOutlined,
  ImportOutlined,
  ExportOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import {
  getProcGroupItems,
  createProcGroup,
  delProcGroup,
  enableModel,
  deleteModel,
  copyModel,
  updateGroupName,
  updateGroupSort,
  updateGroupModelSort,
  getProcActiveModel,
  saveModel,
} from '@/api/model';
import { NodeTypes } from '@/views/process/ProcessNodes';
import { useTranslation } from '@/i18n';
import { exportText } from '@/utils/ProcessUtil';
import {
  defaultModelPayload,
  parseJson,
  resolveAdminLabel,
  resolveStartupLabel,
  sanitizeModelForTransfer,
  type ModelLogo,
} from '@/components/modelDefaults';

interface ModelItem {
  code: string;
  name?: string;
  procName?: string;
  version?: number;
  status?: number;
  hasNewVersion?: boolean;
  hasManagePerm?: boolean;
  updateTime?: string;
  remark?: string;
  logo?: string;
  startupRange?: string;
  startupPerm?: string;
  adminPerm?: string;
  defineId?: string;
}

interface GroupItem {
  id: string;
  name: string;
  sort?: number;
  items: ModelItem[];
}

const DEFAULT_LOGO: ModelLogo = { name: 'file-icons:omnigraffle', bgc: '#4C87F3', color: '#FFFFFF' };

export const ModelManager: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [search, setSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importGroupRef = useRef('');

  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupModalId, setGroupModalId] = useState('');
  const [groupName, setGroupName] = useState('');

  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [copyCode, setCopyCode] = useState('');
  const [copyName, setCopyName] = useState('');

  useEffect(() => {
    void loadList();
  }, []);

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await getProcGroupItems();
      const list = Array.isArray(res.data) ? res.data : [];
      setGroups(
        list.map((group: any) => ({
          ...group,
          items: Array.isArray(group.items) ? group.items : [],
        }))
      );
    } catch (e: any) {
      message.error(e?.msg || t('admin.modelManager.fetchFailed'));
    } finally {
      setLoading(false);
    }
  };

  const dataGroups = useMemo(() => {
    const term = search.trim();
    if (!term) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => (item.procName || item.name || '').includes(term)),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, search]);

  const sortDisabled = search.trim() !== '';

  const getLogo = (item: ModelItem): ModelLogo => parseJson<ModelLogo>(item.logo, DEFAULT_LOGO);

  const openCreateGroup = () => {
    setGroupModalId('');
    setGroupName('');
    setGroupModalOpen(true);
  };

  const openRenameGroup = (group: GroupItem) => {
    setGroupModalId(group.id);
    setGroupName(group.name);
    setGroupModalOpen(true);
  };

  const handleSaveGroup = async () => {
    const name = groupName.trim();
    if (name.length < 2 || name.length > 30) {
      message.warning(t('admin.modelManager.nameLength'));
      return;
    }
    try {
      if (groupModalId) await updateGroupName(groupModalId, name);
      else await createProcGroup(name);
      message.success(
        groupModalId ? t('admin.modelManager.groupUpdated') : t('admin.modelManager.groupCreated')
      );
      setGroupModalOpen(false);
      await loadList();
    } catch (e: any) {
      message.error(e?.msg || t('common.failed'));
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const res = await delProcGroup(groupId);
      message.success(res.data || t('admin.modelManager.groupDeleted'));
      await loadList();
    } catch (e: any) {
      message.error(e?.msg || t('admin.modelManager.deleteGroupFailed'));
    }
  };

  const handleGroupSort = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= groups.length) return;
    const next = [...groups];
    [next[index], next[target]] = [next[target], next[index]];
    setGroups(next);
    try {
      const res = await updateGroupSort(next.map((group) => group.id));
      message.success(res.data || t('admin.modelManager.sortSuccess'));
    } catch (e: any) {
      message.error(e?.msg || t('admin.modelManager.sortFailed'));
    }
    await loadList();
  };

  const handleModelSort = async (group: GroupItem, index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= group.items.length) return;
    const next = [...group.items];
    [next[index], next[target]] = [next[target], next[index]];
    try {
      const res = await updateGroupModelSort(
        group.id,
        next.map((item) => item.code)
      );
      message.success(res.data || t('admin.modelManager.sortSuccess'));
    } catch (e: any) {
      message.error(e?.msg || t('admin.modelManager.sortFailed'));
    }
    await loadList();
  };

  const handleCreateModel = async (targetGroupId?: string) => {
    try {
      let groupId = targetGroupId || groups[0]?.id || '';
      if (!groupId) {
        const created = await createProcGroup(t('admin.modelManager.defaultGroup'));
        groupId = created.data;
      }
      const code = `proc-${crypto.randomUUID()}`;
      const sort = (groups.find((group) => group.id === groupId)?.items?.length || 0) + 1;
      await saveModel(
        defaultModelPayload({
          code,
          procName: t('admin.common.untitledProcess'),
          groupId,
          sort,
          process: NodeTypes.Start.create(),
        })
      );
      message.success(t('admin.modelManager.createSuccess'));
      window.open(`/designer?code=${encodeURIComponent(code)}`, '_blank');
      await loadList();
    } catch (e: any) {
      message.error(e?.msg || t('admin.modelManager.createFailed'));
    }
  };

  const handleToggleEnable = (item: ModelItem) => {
    const enable = item.status !== 1;
    Modal.confirm({
      title: t('common.tip'),
      content: t('admin.modelManager.toggleConfirm')
        .replace('{action}', enable ? t('design.modelMg.enable') : t('design.modelMg.disable'))
        .replace('{name}', item.procName || item.name || ''),
      okText: t('common.confirm'),
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          const res = await enableModel(enable, item.code);
          message.success(res.data || (enable ? t('admin.modelManager.enableSuccess') : t('admin.modelManager.disableSuccess')));
          await loadList();
        } catch (e: any) {
          message.error(e?.msg || t('common.failed'));
        }
      },
    });
  };

  const handleDeleteModel = async (code: string) => {
    try {
      const res = await deleteModel(code);
      message.success(res.data || t('admin.common.deleteSuccess'));
      await loadList();
    } catch (e: any) {
      message.error(e?.msg || t('admin.common.deleteFailed'));
    }
  };

  const handleOpenCopy = (item: ModelItem) => {
    setCopyCode(item.code);
    setCopyName(`${item.procName || item.name} ${t('admin.modelManager.copySuffix')}`);
    setCopyModalOpen(true);
  };

  const handleConfirmCopy = async () => {
    if (!copyName.trim()) {
      message.warning(t('admin.modelManager.copyNameRequired'));
      return;
    }
    try {
      const res = await copyModel(copyCode, copyName.trim());
      message.success(res.data || t('admin.modelManager.copySuccess'));
      setCopyModalOpen(false);
      await loadList();
    } catch (e: any) {
      message.error(e?.msg || t('admin.modelManager.copyFailed'));
    }
  };

  const handleImportClick = (groupId: string) => {
    importGroupRef.current = groupId;
    fileInputRef.current?.click();
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(String(evt.target?.result || ''));
        const payload = sanitizeModelForTransfer(parsed);
        payload.code = null;
        payload.id = null;
        payload.groupId = importGroupRef.current;
        await saveModel(payload);
        message.success(t('admin.modelManager.importSuccess'));
        await loadList();
      } catch (e: any) {
        message.warning(e?.msg || t('admin.modelManager.importFailed'));
      }
    };
    reader.readAsText(file);
  };

  const handleExport = async (item: ModelItem) => {
    try {
      const res = await getProcActiveModel(item.code);
      exportText(
        JSON.stringify(sanitizeModelForTransfer(res.data)),
        `${item.procName || item.name || item.code}-v${item.version || 1}.json`
      );
    } catch (e: any) {
      message.error(e?.msg || t('admin.modelManager.exportFailed'));
    }
  };

  const renderModel = (group: GroupItem, item: ModelItem, index: number) => {
    const modelLogo = getLogo(item);
    const active = item.status === 1;
    const manage = Boolean(item.hasManagePerm);
    const adminLabel = resolveAdminLabel(item) || t('admin.modelManager.adminFallback');

    return (
      <Col span={8} key={item.code}>
        <Card
          size="small"
          hoverable
          style={{ borderRadius: 8, opacity: active ? 1 : 0.75 }}
          styles={{ body: { padding: 12 } }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div
              title={modelLogo.name}
              style={{
                width: 36,
                height: 36,
                borderRadius: 6,
                background: modelLogo.bgc,
                color: modelLogo.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AppstoreOutlined style={{ fontSize: 18 }} />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <Typography.Text strong ellipsis style={{ display: 'block' }}>
                {item.procName || item.name}
              </Typography.Text>
              <Space size={4} wrap>
                <Badge dot={Boolean(item.hasNewVersion)}>
                  <Tag style={{ fontSize: 11 }} color={active ? 'blue' : 'default'}>
                    v{item.version || 1}
                  </Tag>
                </Badge>
                <Tag color={active ? 'success' : 'default'} style={{ fontSize: 11 }}>
                  {active ? t('admin.status.enabled') : t('admin.status.disabled')}
                </Tag>
              </Space>
            </div>
            {!sortDisabled && manage && (
              <Space size={0} direction="vertical">
                <Button
                  type="text"
                  size="small"
                  icon={<ArrowUpOutlined />}
                  disabled={index === 0}
                  onClick={() => handleModelSort(group, index, -1)}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<ArrowDownOutlined />}
                  disabled={index === group.items.length - 1}
                  onClick={() => handleModelSort(group, index, 1)}
                />
              </Space>
            )}
          </div>

          <div style={{ fontSize: 12, color: '#888', minHeight: 20 }}>{item.remark || t('admin.modelManager.noDescription')}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{t('admin.modelManager.updated')}: {item.updateTime || '-'}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{t('admin.modelManager.startupRange')}: {resolveStartupLabel(item)}</div>

          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {manage ? (
              <>
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => navigate(`/designer?code=${item.code}`)}>
                  {t('admin.modelManager.design')}
                </Button>
                <Button type="link" size="small" onClick={() => handleToggleEnable(item)}>
                  {active ? t('design.modelMg.disable') : t('design.modelMg.enable')}
                </Button>
                <Button type="link" size="small" icon={<CopyOutlined />} onClick={() => handleOpenCopy(item)}>
                  {t('design.modelMg.copy')}
                </Button>
                <Button type="link" size="small" icon={<ExportOutlined />} onClick={() => handleExport(item)}>
                  {t('design.modelMg.export')}
                </Button>
                <Popconfirm
                  title={t('admin.modelManager.deleteModelConfirm')}
                  okText={t('admin.modelManager.confirmDelete')}
                  cancelText={t('admin.modelManager.thinkAgain')}
                  onConfirm={() => handleDeleteModel(item.code)}
                >
                  <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                    {t('design.modelMg.del')}
                  </Button>
                </Popconfirm>
              </>
            ) : (
              <>
                <Button type="link" size="small" icon={<ExportOutlined />} onClick={() => handleExport(item)}>
                  {t('design.modelMg.export')}
                </Button>
                <Tooltip title={t('admin.modelManager.onlyAdminEdit').replace('{admin}', adminLabel)}>
                  <Typography.Text type="secondary" ellipsis style={{ fontSize: 12, maxWidth: 160 }}>
                    {t('admin.modelManager.onlyAdminEdit').replace('{admin}', adminLabel)}
                  </Typography.Text>
                </Tooltip>
              </>
            )}
          </div>
        </Card>
      </Col>
    );
  };

  return (
    <div>
      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          {t('admin.modelManager.title')}
        </Typography.Title>
        <Space>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder={t('design.modelMg.search')}
            style={{ width: 220 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button icon={<PlusOutlined />} onClick={openCreateGroup}>
            {t('design.modelMg.newGroup')}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleCreateModel()}>
            {t('design.modelMg.newModel')}
          </Button>
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" />
        </div>
      ) : dataGroups.length === 0 ? (
        <Empty description={search ? t('admin.modelManager.searchEmpty') : t('admin.modelManager.empty')} />
      ) : (
        dataGroups.map((group, groupIndex) => (
          <div key={group.id} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <Space>
                <Typography.Text strong style={{ fontSize: 16 }}>
                  {group.name}
                </Typography.Text>
                <Tag>{t('admin.modelManager.processCount').replace('{count}', String(group.items.length))}</Tag>
                {!sortDisabled && (
                  <Space size={0}>
                    <Tooltip title={t('admin.modelManager.groupUp')}>
                      <Button
                        type="text"
                        size="small"
                        icon={<ArrowUpOutlined />}
                        disabled={groupIndex === 0}
                        onClick={() => handleGroupSort(groupIndex, -1)}
                      />
                    </Tooltip>
                    <Tooltip title={t('admin.modelManager.groupDown')}>
                      <Button
                        type="text"
                        size="small"
                        icon={<ArrowDownOutlined />}
                        disabled={groupIndex === dataGroups.length - 1}
                        onClick={() => handleGroupSort(groupIndex, 1)}
                      />
                    </Tooltip>
                  </Space>
                )}
              </Space>
              <Space>
                <Button size="small" type="link" icon={<ImportOutlined />} onClick={() => handleImportClick(group.id)}>
                  {t('admin.modelManager.import')}
                </Button>
                <Button size="small" type="link" icon={<EditOutlined />} onClick={() => openRenameGroup(group)}>
                  {t('common.edit')}
                </Button>
                <Popconfirm
                  title={t('admin.modelManager.deleteGroupConfirm')}
                  okText={t('admin.modelManager.confirmDelete')}
                  cancelText={t('common.cancel')}
                  onConfirm={() => handleDeleteGroup(group.id)}
                >
                  <Button size="small" type="link" danger>
                    {t('common.delete')}
                  </Button>
                </Popconfirm>
                <Button size="small" type="link" onClick={() => handleCreateModel(group.id)}>
                  {t('admin.modelManager.createInGroup')}
                </Button>
              </Space>
            </div>

            {group.items.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 16 }}>
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => handleCreateModel(group.id)}>
                  {t('design.modelMg.newModel')}
                </Button>
              </div>
            ) : (
              <Row gutter={[16, 16]}>{group.items.map((item, index) => renderModel(group, item, index))}</Row>
            )}
          </div>
        ))
      )}

      <Modal
        title={groupModalId ? t('admin.modelManager.editGroupTitle') : t('admin.modelManager.newGroupTitle')}
        open={groupModalOpen}
        onCancel={() => setGroupModalOpen(false)}
        onOk={handleSaveGroup}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
      >
        <Input
          placeholder={t('admin.modelManager.groupNamePlaceholder')}
          value={groupName}
          maxLength={30}
          onChange={(e) => setGroupName(e.target.value)}
          onPressEnter={handleSaveGroup}
        />
      </Modal>

      <Modal
        title={t('admin.modelManager.copyTitle')}
        open={copyModalOpen}
        onCancel={() => setCopyModalOpen(false)}
        onOk={handleConfirmCopy}
        okText={t('common.confirm')}
        cancelText={t('common.cancel')}
      >
        <Input
          placeholder={t('admin.modelManager.copyPlaceholder')}
          value={copyName}
          maxLength={30}
          onChange={(e) => setCopyName(e.target.value)}
          onPressEnter={handleConfirmCopy}
        />
      </Modal>
    </div>
  );
};

export default ModelManager;
