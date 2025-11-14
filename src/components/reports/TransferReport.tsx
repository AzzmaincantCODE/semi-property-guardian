import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface TransferItem {
  propertyNumber: string;
  description: string;
  quantity: number;
  unit: string;
  serialNumber: string;
  condition: string;
  remarks: string;
}

interface TransferReportProps {
  data: {
    transferNumber: string;
    date: string;
    fromDepartment: string;
    toDepartment: string;
    fromCustodian: string;
    toCustodian: string;
    reason: string;
    items: TransferItem[];
  };
}

export const TransferReport: React.FC<TransferReportProps> = ({ data }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <h2 className="text-2xl font-bold">Inventory Transfer Report</h2>
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      <Card className="print:shadow-none print:border-2 print:border-black">
        <CardHeader className="text-center border-b-2 border-black">
          <div className="space-y-2">
            <h1 className="text-xl font-bold uppercase">INVENTORY TRANSFER REPORT</h1>
            <p className="text-sm">Republic of the Philippines</p>
            <p className="text-sm font-semibold">[Department/Agency Name]</p>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="space-y-3">
              <div className="border-b border-gray-400 pb-1">
                <label className="text-xs font-semibold uppercase">Transfer Number:</label>
                <p className="font-mono text-lg">{data.transferNumber}</p>
              </div>
              <div className="border-b border-gray-400 pb-1">
                <label className="text-xs font-semibold uppercase">Date:</label>
                <p className="text-sm">{data.date}</p>
              </div>
              <div className="border-b border-gray-400 pb-1">
                <label className="text-xs font-semibold uppercase">From Department:</label>
                <p className="text-sm">{data.fromDepartment}</p>
              </div>
              <div className="border-b border-gray-400 pb-1">
                <label className="text-xs font-semibold uppercase">From Custodian:</label>
                <p className="text-sm">{data.fromCustodian}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="border-b border-gray-400 pb-1">
                <label className="text-xs font-semibold uppercase">To Department:</label>
                <p className="text-sm">{data.toDepartment}</p>
              </div>
              <div className="border-b border-gray-400 pb-1">
                <label className="text-xs font-semibold uppercase">To Custodian:</label>
                <p className="text-sm">{data.toCustodian}</p>
              </div>
              <div className="border-b border-gray-400 pb-1">
                <label className="text-xs font-semibold uppercase">Reason for Transfer:</label>
                <p className="text-sm">{data.reason}</p>
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
                  <th className="border-r border-black p-2 text-center">Unit</th>
                  <th className="border-r border-black p-2 text-center">Serial Number</th>
                  <th className="border-r border-black p-2 text-center">Condition</th>
                  <th className="p-2 text-center">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-300">
                    <td className="border-r border-black p-2 text-center">{index + 1}</td>
                    <td className="border-r border-black p-2 text-center font-mono">{item.propertyNumber}</td>
                    <td className="border-r border-black p-2">{item.description}</td>
                    <td className="border-r border-black p-2 text-center">{item.quantity}</td>
                    <td className="border-r border-black p-2 text-center">{item.unit}</td>
                    <td className="border-r border-black p-2 text-center font-mono">{item.serialNumber}</td>
                    <td className="border-r border-black p-2 text-center">{item.condition}</td>
                    <td className="p-2">{item.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="grid grid-cols-4 gap-4 mt-8 pt-4 border-t-2 border-black">
            <div className="text-center">
              <div className="border-b border-black mb-1 pb-8"></div>
              <p className="text-xs font-semibold">Released by:</p>
              <p className="text-xs">(Signature over Printed Name)</p>
            </div>
            <div className="text-center">
              <div className="border-b border-black mb-1 pb-8"></div>
              <p className="text-xs font-semibold">Received by:</p>
              <p className="text-xs">(Signature over Printed Name)</p>
            </div>
            <div className="text-center">
              <div className="border-b border-black mb-1 pb-8"></div>
              <p className="text-xs font-semibold">Approved by:</p>
              <p className="text-xs">Supply Officer</p>
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