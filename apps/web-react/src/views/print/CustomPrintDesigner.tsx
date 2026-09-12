import React, { forwardRef } from 'react';
import { PrintDialogs } from './custom-print-designer/PrintDialogs';
import { PrintFieldPalette } from './custom-print-designer/PrintFieldPalette';
import { PrintFooter } from './custom-print-designer/PrintFooter';
import { PrintToolbar } from './custom-print-designer/PrintToolbar';
import { useCustomPrintDesigner } from './custom-print-designer/useCustomPrintDesigner';
import type { CustomPrintDesignerProps, PrintDesignerHandle } from './custom-print-designer/types';
import './print.css';

export type { PrintDesignerHandle } from './custom-print-designer/types';

export const CustomPrintDesigner = forwardRef<PrintDesignerHandle, CustomPrintDesignerProps>(
  ({ readonly = false, showTools = true, config, formFields = [] }, ref) => {
    const d = useCustomPrintDesigner({ ref, config, formFields });

    return (
      <div className="w-print-designer" style={{ height: 'calc(100vh - 160px)' }}>
        {showTools && !readonly && (
          <PrintToolbar
            cmd={d.cmd}
            selected={d.selected}
            searchInfo={d.searchInfo}
            onInsertImgCode={d.insertImgCode}
            onInsertImage={d.insertImage}
            onUploadImage={d.uploadImage}
            onImportDoc={d.importDoc}
            onOpenWatermark={() => d.setWatermarkOpen(true)}
            onOpenLink={() => d.setLinkOpen(true)}
            onOpenCodeblock={d.openCodeblock}
            onInsertDiagram={d.insertDiagram}
            onSearch={d.search}
            onSearchNavigate={d.searchNavigate}
            onReplace={d.replaceSearch}
            onReplaceAll={d.replaceAllSearch}
          />
        )}
        <input type="file" ref={d.fileInputRef} accept=".doc,.docx" style={{ display: 'none' }} onChange={d.onFileChange} />
        <input type="file" ref={d.imageInputRef} accept="image/*" style={{ display: 'none' }} onChange={d.onImageChange} />

        <div className="w-print-designer-body">
          {showTools && !readonly && <PrintFieldPalette fieldGroups={d.fieldGroups} onDragField={d.dragField} />}
          <div ref={d.printerRef} className="w-print-pages" />
        </div>

        {showTools && !readonly && (
          <PrintFooter wordCount={d.wordCount} pageNo={d.pageNo} pageCount={d.pageCount} scale={d.scale} onScale={d.doScale} cmd={d.cmd} />
        )}

        <PrintDialogs
          watermarkOpen={d.watermarkOpen}
          onCancelWatermark={() => d.setWatermarkOpen(false)}
          watermark={d.watermark}
          setWatermark={d.setWatermark}
          onInsertWatermark={d.insertWatermark}
          linkOpen={d.linkOpen}
          onCancelLink={() => d.setLinkOpen(false)}
          link={d.link}
          setLink={d.setLink}
          onInsertLinkOk={d.insertLinkOk}
          codeblockOpen={d.codeblockOpen}
          onCancelCodeblock={() => d.setCodeblockOpen(false)}
          codeblockContent={d.codeblockContent}
          setCodeblockContent={d.setCodeblockContent}
          onInsertCodeblock={d.insertCodeblock}
          promptState={d.promptState}
          setPromptState={d.setPromptState}
          promptValue={d.promptValue}
          setPromptValue={d.setPromptValue}
        />
      </div>
    );
  }
);

CustomPrintDesigner.displayName = 'CustomPrintDesigner';

export default CustomPrintDesigner;
