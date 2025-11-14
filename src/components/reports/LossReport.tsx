import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface LossItem {
  propertyNumber: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  dateAcquired: string;
  dateOfLoss: string;
  cause: string;
  responsible: string;
  actionTaken: string;
}

interface LossReportProps {
  data: {
    reportNumber: string;
    reportDate: string;
    department: string;
    reportedBy: string;
    investigatedBy: string;
    items: LossItem[];
    totalLoss: number;
  };
}

export const LossReport: React.FC<LossReportProps> = ({ data }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <h2 className="text-2xl font-bold">Report of Lost, Stolen, Damaged or Destroyed Property</h2>
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      <Card className="print:shadow-none print:border-2 print:border-black">
        <CardHeader className="text-center border-b-2 border-black">
          <div className="space-y-2">
            <h1 className="text-lg font-bold uppercase">REPORT OF LOST, STOLEN, DAMAGED OR DESTROYED PROPERTY</h1>
            <p className="text-sm">Republic of the Philippines</p>
            <p className="text-sm font-semibold">[Department/Agency Name]</p>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="space-y-3">
              <div className="border-b border-gray-400 pb-1">
                <label className="text-xs font-semibold uppercase">Report Number:</label>
                <p className="font-mono text-lg">{data.reportNumber}</p>
              </div>
              <div className="border-b border-gray-400 pb-1">
                <label className="text-xs font-semibold uppercase">Report Date:</label>
                <p className="text-sm">{data.reportDate}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="border-b border-gray-400 pb-1">
                <label className="text-xs font-semibold uppercase">Department:</label>
                <p className="text-sm">{data.department}</p>
              </div>
              <div className="border-b border-gray-400 pb-1">
                <label className="text-xs font-semibold uppercase">Reported By:</label>
                <p className="text-sm">{data.reportedBy}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="border-b border-gray-400 pb-1">
                <label className="text-xs font-semibold uppercase">Investigated By:</label>
                <p className="text-sm">{data.investigatedBy}</p>
              </div>
            </div>
          </div>
          
          <div className="border-2 border-black">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-black bg-gray-100">
                  <th className="border-r border-black p-2 text-center">Item No.</th>
                  <th className="border-r border-black p-2 text-center">Property Number</th>
                  <th className="border-r border-black p-2 text-center">Description</th>
                  <th className="border-r border-black p-2 text-center">Qty</th>
                  <th className="border-r border-black p-2 text-center">Unit Cost</th>
                  <th className="border-r border-black p-2 text-center">Total Cost</th>
                  <th className="border-r border-black p-2 text-center">Date Acquired</th>
                  <th className="border-r border-black p-2 text-center">Date of Loss</th>
                  <th className="border-r border-black p-2 text-center">Cause</th>
                  <th className="border-r border-black p-2 text-center">Responsible Person</th>
                  <th className="p-2 text-center">Action Taken</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-300">
                    <td className="border-r border-black p-2 text-center">{index + 1}</td>
                    <td className="border-r border-black p-2 text-center font-mono">{item.propertyNumber}</td>
                    <td className="border-r border-black p-2">{item.description}</td>
                    <td className="border-r border-black p-2 text-center">{item.quantity}</td>
                    <td className="border-r border-black p-2 text-right">₱{item.unitCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    <td className="border-r border-black p-2 text-right font-semibold">₱{item.totalCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    <td className="border-r border-black p-2 text-center">{item.dateAcquired}</td>
                    <td className="border-r border-black p-2 text-center">{item.dateOfLoss}</td>
                    <td className="border-r border-black p-2">{item.cause}</td>
                    <td className="border-r border-black p-2">{item.responsible}</td>
                    <td className="p-2">{item.actionTaken}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-black bg-gray-100">
                  <td colSpan={5} className="border-r border-black p-2 text-center font-semibold">TOTAL LOSS VALUE:</td>
                  <td className="border-r border-black p-2 text-right font-bold text-lg text-red-600">
                    ₱{data.totalLoss.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={5} className="p-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div className="mt-6 p-4 border border-gray-400">
            <h3 className="font-semibold mb-4">RECOMMENDATIONS:</h3>
            <div className="space-y-2 text-sm">
              <div className="border-b border-gray-200 pb-8">
                <p className="text-xs text-gray-500 mb-2">Recommended actions based on investigation findings:</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 mt-8 pt-4 border-t-2 border-black">
            <div className="text-center">
              <div className="border-b border-black mb-1 pb-8"></div>
              <p className="text-xs font-semibold">Prepared by:</p>
              <p className="text-xs">Supply Officer</p>
            </div>
            <div className="text-center">
              <div className="border-b border-black mb-1 pb-8"></div>
              <p className="text-xs font-semibold">Noted by:</p>
              <p className="text-xs">Property Custodian</p>
            </div>
            <div className="text-center">
              <div className="border-b border-black mb-1 pb-8"></div>
              <p className="text-xs font-semibold">Approved by:</p>
              <p className="text-xs">Head of Office</p>
            </div>
            <div className="text-center">
              <div className="border-b border-black mb-1 pb-8"></div>
              <p className="text-xs font-semibold">Date</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};