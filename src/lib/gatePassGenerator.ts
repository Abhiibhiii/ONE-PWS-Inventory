import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, HeadingLevel, VerticalAlign } from 'docx';
import { saveAs } from 'file-saver';
import { GatePass, GatePassItem } from '../types';
import { format, isValid } from 'date-fns';
import { safeFormat } from '../utils/dateUtils';

export const generateGatePassDoc = async (gatePass: GatePass) => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Header Section
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "ONEPWS PRIVATE LIMITED",
                bold: true,
                size: 36,
                color: "1e293b",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Plot No. 123, Industrial Area, Phase-1, New Delhi - 110001",
                size: 18,
                color: "64748b",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "Email: info@onepws.com | Web: www.onepws.com",
                size: 16,
                color: "64748b",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 400 },
            children: [
              new TextRun({
                text: "RETURNABLE GATE PASS",
                bold: true,
                size: 28,
                underline: { type: "single" },
                color: "0f172a",
              }),
            ],
          }),

          // Info Table
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "cbd5e1" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "cbd5e1" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "cbd5e1" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "cbd5e1" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "cbd5e1" },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "cbd5e1" },
            },
            rows: [
              new TableRow({
                children: [
                  createTableCell("Gate Pass No.:", gatePass.gatePassNo, true),
                  createTableCell("Create Date:", safeFormat(gatePass.createDate, 'dd-MM-yyyy'), true),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell("Plant Name:", gatePass.plantName),
                  createTableCell("Transporter:", gatePass.transporter),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell("Receiver Code:", gatePass.receiverCode),
                  createTableCell("Reason:", gatePass.reason),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell("Receiver Name:", gatePass.receiverName),
                  createTableCell("Remark:", gatePass.remark),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell("Receiver Address:", gatePass.receiverAddress),
                  createTableCell("Vehicle No.:", gatePass.vehicleNo),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell("GST No.:", gatePass.gstNo),
                  createTableCell("LR No.:", gatePass.lrNo),
                ],
              }),
              new TableRow({
                children: [
                  createTableCell("Requested By:", gatePass.requestedBy),
                  createTableCell("Dept. Name:", gatePass.deptName),
                ],
              }),
            ],
          }),

          new Paragraph({ text: "", spacing: { before: 200 } }),

          // Items Table
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "94a3b8" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "94a3b8" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "94a3b8" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "94a3b8" },
              insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
              insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "e2e8f0" },
            },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell("SR. No."),
                  createHeaderCell("Material Code"),
                  createHeaderCell("Item Description"),
                  createHeaderCell("HSN"),
                  createHeaderCell("Qty."),
                  createHeaderCell("Unit"),
                  createHeaderCell("Remark"),
                ],
              }),
              ...gatePass.items.map((item, index) => 
                new TableRow({
                  children: [
                    createCell((index + 1).toString()),
                    createCell(item.materialCode),
                    createCell(item.itemDescription),
                    createCell(item.hsn),
                    createCell(item.qty.toString()),
                    createCell(item.unit),
                    createCell(item.remark),
                  ],
                })
              ),
            ],
          }),

          new Paragraph({ text: "", spacing: { before: 800 } }),

          // Signature Section
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            borders: {
              top: { style: BorderStyle.NONE },
              bottom: { style: BorderStyle.NONE },
              left: { style: BorderStyle.NONE },
              right: { style: BorderStyle.NONE },
              insideHorizontal: { style: BorderStyle.NONE },
              insideVertical: { style: BorderStyle.NONE },
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "Prepared By", alignment: AlignmentType.CENTER })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Authorized Signatory", alignment: AlignmentType.CENTER })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Receiver's Signature", alignment: AlignmentType.CENTER })],
                  }),
                ],
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `GatePass_${gatePass.gatePassNo}.docx`);
};

function createTableCell(label: string, value: string, boldLabel = false) {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: label, bold: boldLabel, size: 18 }),
          new TextRun({ text: ` ${value || 'N/A'}`, size: 18 }),
        ],
      }),
    ],
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
  });
}

function createHeaderCell(text: string) {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 18 })],
        alignment: AlignmentType.CENTER,
      }),
    ],
    shading: { fill: "EEEEEE" },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
  });
}

function createCell(text: string) {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text: text || '-', size: 18 })],
        alignment: AlignmentType.CENTER,
      }),
    ],
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
  });
}
