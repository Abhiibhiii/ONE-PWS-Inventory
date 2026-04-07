import React, { useState } from 'react';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import { Input } from '../UI/Input';
import { InvoiceData } from '../../services/ocrService';
import { Check, AlertCircle } from 'lucide-react';

interface OcrValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: InvoiceData;
  onConfirm: (validatedData: {
    purchaseDate: string;
    warrantyMonths: number;
    vendor: string;
    invoiceNo: string;
  }) => void;
}

export const OcrValidationModal: React.FC<OcrValidationModalProps> = ({
  isOpen,
  onClose,
  data,
  onConfirm,
}) => {
  const [purchaseDate, setPurchaseDate] = useState(data.purchaseDate || '');
  const [warrantyMonths, setWarrantyMonths] = useState(data.warrantyMonths || 0);
  const [vendor, setVendor] = useState(data.vendor || '');
  const [invoiceNo, setInvoiceNo] = useState(data.invoiceNo || '');

  const handleConfirm = () => {
    onConfirm({
      purchaseDate,
      warrantyMonths,
      vendor,
      invoiceNo,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Validate Invoice Data" size="md">
      <div className="space-y-6 py-2">
        <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>Please review and correct the data extracted from your invoice. Select from detected options if available.</p>
        </div>

        <div className="space-y-4">
          {/* Purchase Date */}
          <div className="space-y-2">
            <Input
              label="Purchase Date"
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
            {data.purchaseDateOptions && data.purchaseDateOptions.length > 1 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] font-medium text-slate-500 w-full uppercase">Detected Options:</span>
                {data.purchaseDateOptions.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setPurchaseDate(opt)}
                    className="px-2 py-1 text-[10px] rounded bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 transition-colors dark:bg-slate-800 dark:text-slate-400"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Warranty Months */}
          <div className="space-y-2">
            <Input
              label="Warranty Duration (Months)"
              type="number"
              value={warrantyMonths}
              onChange={(e) => setWarrantyMonths(Number(e.target.value))}
            />
            {data.warrantyMonthsOptions && data.warrantyMonthsOptions.length > 1 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] font-medium text-slate-500 w-full uppercase">Detected Options:</span>
                {data.warrantyMonthsOptions.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setWarrantyMonths(opt)}
                    className="px-2 py-1 text-[10px] rounded bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 transition-colors dark:bg-slate-800 dark:text-slate-400"
                  >
                    {opt} months
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Vendor */}
          <div className="space-y-2">
            <Input
              label="Vendor"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
            />
            {data.vendorOptions && data.vendorOptions.length > 1 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] font-medium text-slate-500 w-full uppercase">Detected Options:</span>
                {data.vendorOptions.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setVendor(opt)}
                    className="px-2 py-1 text-[10px] rounded bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 transition-colors dark:bg-slate-800 dark:text-slate-400"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Invoice No */}
          <div className="space-y-2">
            <Input
              label="Invoice Number"
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
            />
            {data.invoiceNoOptions && data.invoiceNoOptions.length > 1 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] font-medium text-slate-500 w-full uppercase">Detected Options:</span>
                {data.invoiceNoOptions.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => setInvoiceNo(opt)}
                    className="px-2 py-1 text-[10px] rounded bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 transition-colors dark:bg-slate-800 dark:text-slate-400"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm}>
            <Check className="mr-2 h-4 w-4" /> Confirm & Apply
          </Button>
        </div>
      </div>
    </Modal>
  );
};
