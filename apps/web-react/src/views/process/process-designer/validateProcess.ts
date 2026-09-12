import { isConditionComplete } from '@/utils/ConditionCompare';
import { t } from '@/i18n';
import { formatMessage } from '@/utils/i18n';
import { forEachNode } from '../processTree';

export function validateProcess(root: any[]): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const duplicates = new Set<string>();
  forEachNode(root, (node) => {
    if (!node?.id) return;
    if (ids.has(node.id)) duplicates.add(node.id);
    ids.add(node.id);
  });
  duplicates.forEach((id) => {
    const node = root.find((item) => item?.id === id);
    errors.push(formatMessage(t('process.validate.duplicateId'), { name: node?.name || id }));
  });
  if (!(root || []).some((node) => node?.type === 'Start')) errors.push(t('process.validate.missingStart'));

  const checkList = (list: any[], scope: string) => {
    if (!Array.isArray(list) || list.length === 0) return;
    list.forEach((node, index) => {
      if (!node) return;
      const isLast = index === list.length - 1;
      const prefix = scope ? `${scope} - ` : '';
      if (!isLast && !node.childId) errors.push(formatMessage(t('process.validate.notConnected'), { prefix, name: node.name }));
      if (node.childId && !ids.has(node.childId)) errors.push(formatMessage(t('process.validate.childMissing'), { prefix, name: node.name }));
      if (node.parentId && node.parentId !== 'start' && !ids.has(node.parentId)) {
        errors.push(formatMessage(t('process.validate.parentMissing'), { prefix, name: node.name }));
      }
      if (node.type === 'Gateway') {
        const join = list[index + 1];
        if (!join || join.type !== 'Join') errors.push(formatMessage(t('process.validate.gatewayNoJoin'), { prefix, name: node.name }));
        const headers = node.props?.branch || [];
        const bodies = node.branch || [];
        if (headers.length !== bodies.length) errors.push(formatMessage(t('process.validate.gatewayBranchMismatch'), { prefix, name: node.name }));
        if (headers.length < 2) errors.push(formatMessage(t('process.validate.gatewayMinBranches'), { prefix, name: node.name }));
        bodies.forEach((body: any[], bi: number) => {
          const header = headers[bi];
          const branchName = header?.name || formatMessage(t('process.validate.branchName'), { n: bi + 1 });
          checkList(body, branchName);
          const isDefault = bi === bodies.length - 1 && node.props?.type !== 'Parallel';
          if (!isDefault) {
            const groups = header?.props?.groups || [];
            const complete = groups.length > 0 && groups.every((group: any) => (group.conditions || []).length > 0);
            if (!complete) errors.push(formatMessage(t('process.validate.branchIncomplete'), { branch: branchName }));
            (groups || []).forEach((group: any) => {
              (group.conditions || []).forEach((cd: any) => {
                if (!isConditionComplete(cd)) errors.push(formatMessage(t('process.validate.branchConditionIncomplete'), { branch: branchName }));
              });
            });
          }
          const last = body[body.length - 1];
          if (last && join && last.childId !== join.id) errors.push(formatMessage(t('process.validate.branchNotJoined'), { branch: branchName }));
        });
      }
    });
  };
  checkList(root || [], '');
  return Array.from(new Set(errors));
}
