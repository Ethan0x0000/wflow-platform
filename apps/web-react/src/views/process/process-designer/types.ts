export interface ProcessDesignerProps {
  value: any[];
  onChange?: (val: any[]) => void;
  formFields?: any[];
}

export interface ClipboardData {
  kind: 'node' | 'branch';
  node?: any;
  brNode?: any;
  brNodes?: any[];
}
