import { mergeDicts } from './merge';
import common from './zh_cn/common';
import admin from './zh_cn/admin';
import workspace from './zh_cn/workspace';
import process from './zh_cn/process';
import form from './zh_cn/form';
import print from './zh_cn/print';

export default mergeDicts(common, admin, workspace, process, form, print);
