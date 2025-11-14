import React from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { AnnexICSPrintData } from "@/types/annex";

export const InventoryCustodianSlipReport: React.FC<{ data: AnnexICSPrintData }> = ({ data }) => {
  // Generate empty rows to fill the table (typically 15-20 rows for standard forms)
  const totalRows = 15;
  const emptyRows = Math.max(0, totalRows - data.items.length);

  return (
    <div className="max-w-4xl mx-auto bg-white">
      {/* Print button - hidden when printing */}
      <div className="flex justify-end mb-4 print:hidden">
        <Button onClick={() => window.print()} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      {/* Exact Annex format matching the image */}
      <div className="border-2 border-black print:border-black min-h-[11in] font-mono text-sm">
        {/* Header */}
        <div className="text-center py-3 border-b border-black">
          <h1 className="text-lg font-bold">INVENTORY CUSTODIAN SLIP</h1>
        </div>

        {/* Entity Name, Fund Cluster, and ICS No. */}
        <div className="grid grid-cols-2 border-b border-black">
          <div className="p-2 border-r border-black">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold">Entity Name:</span>
              <div className="border-b border-black flex-1 min-h-[20px] px-1">
                {data.entityName}
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs font-semibold">Fund Cluster:</span>
              <div className="border-b border-black flex-1 min-h-[20px] px-1">
                {data.fundCluster}
              </div>
            </div>
          </div>
          <div className="p-2 flex items-start justify-end">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold">ICS No.:</span>
              <div className="border-b border-black min-w-[120px] min-h-[20px] px-1">
                {data.slipNumber}
              </div>
            </div>
          </div>
        </div>

        {/* Main table */}
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border-r border-black p-2 w-16 text-center font-semibold">Quantity</th>
              <th className="border-r border-black p-2 w-12 text-center font-semibold">Units of Measure</th>
              <th className="border-r border-black p-2 text-center font-semibold">
                <div>Amount</div>
                <div className="grid grid-cols-2 border-t border-black mt-1">
                  <div className="border-r border-black p-1">Unit Cost</div>
                  <div className="p-1">Total Cost</div>
                </div>
              </th>
              <th className="border-r border-black p-2 text-center font-semibold">Description</th>
              <th className="border-r border-black p-2 w-16 text-center font-semibold">Item No.</th>
              <th className="p-2 w-20 text-center font-semibold">
                <div>Estimated</div>
                <div>Useful Life</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Data rows */}
            {data.items.map((item, index) => (
              <tr key={index} className="border-b border-black">
                <td className="border-r border-black p-2 text-center align-top">
                  {item.quantity}
                </td>
                <td className="border-r border-black p-2 text-center align-top">
                  {item.unit}
                </td>
                <td className="border-r border-black p-0 align-top">
                  <div className="grid grid-cols-2 h-full">
                    <div className="border-r border-black p-2 text-right">
                      ₱{item.unitCost.toFixed(2)}
                    </div>
                    <div className="p-2 text-right">
                      ₱{item.totalCost.toFixed(2)}
                    </div>
                  </div>
                </td>
                <td className="border-r border-black p-2 align-top">
                  {item.description}
                </td>
                <td className="border-r border-black p-2 text-center align-top">
                  {item.itemNumber}
                </td>
                <td className="p-2 text-center align-top">
                  {item.estimatedUsefulLife}
                </td>
              </tr>
            ))}
            
            {/* Empty rows to fill the form */}
            {Array.from({ length: emptyRows }).map((_, index) => (
              <tr key={`empty-${index}`} className="border-b border-black">
                <td className="border-r border-black p-2 h-8">&nbsp;</td>
                <td className="border-r border-black p-2">&nbsp;</td>
                <td className="border-r border-black p-0">
                  <div className="grid grid-cols-2 h-8">
                    <div className="border-r border-black">&nbsp;</div>
                    <div>&nbsp;</div>
                  </div>
                </td>
                <td className="border-r border-black p-2">&nbsp;</td>
                <td className="border-r border-black p-2">&nbsp;</td>
                <td className="p-2">&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signature section */}
        <div className="grid grid-cols-2 border-t border-black">
          <div className="border-r border-black p-4">
            <div className="text-xs font-semibold mb-1">Received from:</div>
            <div className="mt-12 pt-8">
              <div className="border-b border-black mb-1 text-center px-1 min-h-[20px]">
                {data.issuedBy || ''}
              </div>
              <div className="text-center text-[10px]">Signature Over Printed Name</div>
              <div className="border-b border-black mb-1 mt-4 text-center px-1 min-h-[20px]">
                {/* Position/Office for issuer not provided explicitly; show office if available */}
                {data.office || ''}
              </div>
              <div className="text-center text-[10px]">Position/Office</div>
              <div className="border-b border-black mb-1 mt-4 text-center px-1 min-h-[20px]">
                {data.dateIssued || ''}
              </div>
              <div className="text-center text-[10px]">Date</div>
            </div>
          </div>
          <div className="p-4">
            <div className="text-xs font-semibold mb-1">Received by:</div>
            <div className="mt-12 pt-8">
              <div className="border-b border-black mb-1 text-center px-1 min-h-[20px]">
                {data.receivedBy || data.custodianName || ''}
              </div>
              <div className="text-center text-[10px]">Signature Over Printed Name</div>
              <div className="border-b border-black mb-1 mt-4 text-center px-1 min-h-[20px]">
                {data.designation || data.office || ''}
              </div>
              <div className="text-center text-[10px]">Position/Office</div>
              <div className="border-b border-black mb-1 mt-4 text-center px-1 min-h-[20px]">
                {data.dateIssued || ''}
              </div>
              <div className="text-center text-[10px]">Date</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};