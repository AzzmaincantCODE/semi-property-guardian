import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { AnnexSPCPrintData, AnnexSPCEntry } from "@/types/annex";

interface PropertyCardProps {
  data: AnnexSPCPrintData;
}

export const SemiExpendablePropertyCard: React.FC<PropertyCardProps> = ({ data }) => {
  const handlePrint = () => {
    window.print();
  };

  const entries = React.useMemo(() => {
    let runningQty = 0;
    let runningAmount = 0;
    return (data.entries || []).map((e) => {
      const receipt = Number(e.receiptQty || 0);
      const issue = Number(e.issueQty || 0);
      const receiptAmount = Number(e.totalCost || e.amount || 0);
      const issueAmount = 0; // Issue entries don't have amounts typically
      
      runningQty = runningQty + receipt - issue;
      runningAmount = runningAmount + receiptAmount - issueAmount;
      
      return { 
        ...e, 
        balanceQty: e.balanceQty != null ? e.balanceQty : runningQty,
        amount: e.amount != null ? e.amount : (e.totalCost != null ? e.totalCost : runningAmount)
      } as AnnexSPCEntry;
    });
  }, [data.entries]);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <h2 className="text-2xl font-bold">Semi-Expendable Property Card</h2>
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      <Card className="print:shadow-none print:border-2 print:border-black">
        <CardHeader className="border-b-2 border-black p-4">
          <div className="relative">
            <div className="absolute right-0 top-0 text-[11px]">Annex A.1</div>
            <div className="text-center">
              <h1 className="text-base font-bold uppercase tracking-wide">SEMI-EXPANDABLE PROPERTY CARD</h1>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 space-y-4">
          {/* Entity and Fund Cluster */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Entity Name :</span>
              <div className="flex-1 border-b border-black leading-4">{data.entityName}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Fund Cluster:</span>
              <div className="flex-1 border-b border-black leading-4">{data.fundCluster}</div>
            </div>
          </div>

          {/* Semi-expendable Property and Number */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Semi-expendable Property:</span>
              <div className="flex-1 border-b border-black leading-4">{data.semiExpendableProperty}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Semi-expendable Property Number:</span>
              <div className="flex-1 border-b border-black leading-4">{data.propertyNumber}</div>
            </div>
          </div>

          {/* Description */}
          <div className="text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Description :</span>
              <div className="flex-1 border-b border-black leading-4">{data.description}</div>
            </div>
          </div>

          {/* Table */}
          <div className="border-2 border-black">
            <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="border-r border-black p-1 text-center w-[8%]">Date</th>
                  <th className="border-r border-black p-1 text-center w-[12%]">Reference</th>
                  <th className="border-r border-black p-1 text-center" colSpan={3}>Receipt</th>
                  <th className="border-r border-black p-1 text-center" colSpan={3}>Issue/Transfer/Disposal</th>
                  <th className="border-r border-black p-1 text-center" colSpan={2}>Balance</th>
                  <th className="p-1 text-center w-[14%]">Remarks</th>
                </tr>
                <tr className="border-b border-black">
                  <th className="border-r border-black p-1"></th>
                  <th className="border-r border-black p-1"></th>
                  <th className="border-r border-black p-1 text-center w-[6%]">Qty.</th>
                  <th className="border-r border-black p-1 text-center w-[10%]">Unit Cost</th>
                  <th className="border-r border-black p-1 text-center w-[10%]">Total Cost</th>
                  <th className="border-r border-black p-1 text-center w-[8%]">Item No.</th>
                  <th className="border-r border-black p-1 text-center w-[6%]">Qty.</th>
                  <th className="border-r border-black p-1 text-center w-[14%]">Office/Officer</th>
                  <th className="border-r border-black p-1 text-center w-[6%]">Qty.</th>
                  <th className="border-r border-black p-1 text-center w-[10%]">Amount</th>
                  <th className="p-1"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={index} className="border-b border-gray-300">
                    <td className="border-r border-black p-2 text-center align-top">{entry.date}</td>
                    <td className="border-r border-black p-2 text-center align-top">{entry.reference}</td>
                    <td className="border-r border-black p-2 text-center align-top">{entry.receiptQty != null ? entry.receiptQty : ''}</td>
                    <td className="border-r border-black p-2 text-center align-top">{entry.unitCost != null ? `₱${Number(entry.unitCost).toFixed(2)}` : ''}</td>
                    <td className="border-r border-black p-2 text-center align-top">{entry.totalCost != null ? `₱${Number(entry.totalCost).toFixed(2)}` : ''}</td>
                    <td className="border-r border-black p-2 text-center align-top">{entry.issueItemNo || ''}</td>
                    <td className="border-r border-black p-2 text-center align-top">{entry.issueQty != null && entry.issueQty !== 0 ? entry.issueQty : ''}</td>
                    <td className="border-r border-black p-2 align-top">{entry.officeOfficer || ''}</td>
                    <td className="border-r border-black p-2 text-center align-top">{entry.balanceQty != null ? entry.balanceQty : ''}</td>
                    <td className="border-r border-black p-2 text-center align-top">{entry.amount != null ? `₱${Number(entry.amount).toFixed(2)}` : ''}</td>
                    <td className="p-2 align-top">{entry.remarks || ''}</td>
                  </tr>
                ))}
                {Array.from({ length: Math.max(0, 15 - data.entries.length) }).map((_, index) => (
                  <tr key={`empty-${index}`} className="border-b border-gray-300">
                    {Array.from({ length: 11 }).map((__, i) => (
                      <td key={i} className={`${i < 10 ? 'border-r border-black' : ''} p-3 h-8`}> </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-6 mt-6 pt-4 border-t-2 border-black">
            <div className="text-center">
              <div className="border-b border-black mb-1 pb-8"></div>
              <p className="text-[11px] font-semibold">Property and/or Supply Custodian</p>
            </div>
            <div className="text-center">
              <div className="border-b border-black mb-1 pb-8"></div>
              <p className="text-[11px] font-semibold">Accountable Officer</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};