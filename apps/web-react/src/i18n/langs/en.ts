import { mergeDicts } from './merge';
import common from './en/common';
import admin from './en/admin';
import workspace from './en/workspace';
import process from './en/process';
import form from './en/form';
import print from './en/print';

export default mergeDicts(common, admin, workspace, process, form, print);
