import React from 'react';
import { CalcFormulaConfig } from './type-config/CalcFormulaConfig';
import { ContentTypeConfig } from './type-config/ContentTypeConfig';
import { FormListConfig } from './type-config/FormListConfig';
import { NumberTextTypeConfig } from './type-config/NumberTextTypeConfig';
import { PickerTypeConfig } from './type-config/PickerTypeConfig';
import { SpanLayoutConfig } from './type-config/SpanLayoutConfig';
import { TableLayoutConfig } from './type-config/TableLayoutConfig';
import { TableListConfig } from './type-config/TableListConfig';
import { UploadTypeConfig } from './type-config/UploadTypeConfig';
import type { TypeConfigProps } from './type-config/types';

export type { TypeConfigProps } from './type-config/types';

export const TypeConfig: React.FC<TypeConfigProps> = (props) => {
  switch (props.item.type) {
    case 'SpanLayout':
      return <SpanLayoutConfig {...props} />;
    case 'TableLayout':
      return <TableLayoutConfig {...props} />;
    case 'TableList':
      return <TableListConfig {...props} />;
    case 'FormList':
      return <FormListConfig {...props} />;
    case 'SinglePicker':
    case 'MultiplePicker':
    case 'DateTimePicker':
    case 'DateTimeRangePicker':
    case 'TimePicker':
    case 'TimeRangePicker':
    case 'UserPicker':
    case 'DeptPicker':
    case 'Provinces':
      return <PickerTypeConfig {...props} />;
    case 'NumberInput':
    case 'TextInput':
    case 'TextareaInput':
    case 'Score':
      return <NumberTextTypeConfig {...props} />;
    case 'ImageUpload':
    case 'FileUpload':
    case 'Html':
    case 'WebIframe':
    case 'VueSfc':
      return <UploadTypeConfig {...props} />;
    case 'Text':
    case 'LabelText':
    case 'AlertBlock':
    case 'Signature':
    case 'InstQuote':
      return <ContentTypeConfig {...props} />;
    case 'CalcFormula':
      return <CalcFormulaConfig {...props} />;
    case 'RichText':
    case 'PhoneNumber':
    case 'IdCard':
    case 'Location':
    default:
      return null;
  }
};

export default TypeConfig;
