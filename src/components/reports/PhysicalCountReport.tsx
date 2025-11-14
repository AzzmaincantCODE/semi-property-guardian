import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface CountItem {
  propertyNumber: string;
  description: string;
  bookQuantity: number;
  actualQuantity: number;
  variance: number;
  condition: string;
  location: string;
  remarks: string;
}

interface PhysicalCountReportProps {
  data: {
    reportNumber: string;
    countDate: string;
    department: string;
    custodian: string;
    countedBy: string[];
    items: CountItem[];
    totalVariance: number;
  };
}

export const PhysicalCountReport: React.FC<PhysicalCountReportProps> = ({ data }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <h2 className="text-2xl font-bold">Report on Physical Count of Semi-Expandable Property</h2>
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      <Card className="print:shadow-none print:border-2 print:border-black">
        <CardHeader className="text-center border-b-2 border-black">
          <div className="space-y-2">
            <h1 className="text-lg font-bold uppercase">REPORT ON THE PHYSICAL COUNT OF SEMI-EXPANDABLE PROPERTY</h1>
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
                <label className="text-xs font-semibold uppercase">Count Date:</label>
                <p className="text-sm">{data.countDate}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="border-b border-gray-400 pb-1">
                <label className="text-xs font-semibold uppercase">Department:</label>
                <p className="text-sm">{data.department}</p>
              </div>
              <div className="border-b border-gray-400 pb-1">
                <label className="text-xs font-semibold uppercase">Property Custodian:</label>
                <p className="text-sm">{data.custodian}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="border-b border-gray-400 pb-1">
                <label className="text-xs font-semibold uppercase">Counted By:</label>
                <div className="text-sm space-y-1">
                  {data.countedBy.map((person, index) => (
                    <p key={index}>{person}</p>
                  ))}
                </div>
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
                  <th className="border-r border-black p-2 text-center">Book Qty</th>
                  <th className="border-r border-black p-2 text-center">Actual Qty</th>
                  <th className="border-r border-black p-2 text-center">Variance</th>
                  <th className="border-r border-black p-2 text-center">Condition</th>
                  <th className="border-r border-black p-2 text-center">Location</th>
                  <th className="p-2 text-center">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-300">
                    <td className="border-r border-black p-2 text-center">{index + 1}</td>
                    <td className="border-r border-black p-2 text-center font-mono">{item.propertyNumber}</td>
                    <td className="border-r border-black p-2">{item.description}</td>
                    <td className="border-r border-black p-2 text-center">{item.bookQuantity}</td>
                    <td className="border-r border-black p-2 text-center">{item.actualQuantity}</td>
                    <td className={`border-r border-black p-2 text-center font-semibold ${
                      item.variance !== 0 ? (item.variance > 0 ? 'text-green-600' : 'text-red-600') : ''
                    }`}>
                      {item.variance > 0 ? '+' : ''}{item.variance}
                    </td>
                    <td className="border-r border-black p-2 text-center">{item.condition}</td>
                    <td className="border-r border-black p-2 text-center">{item.location}</td>
                    <td className="p-2">{item.remarks}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-black bg-gray-100">
                  <td colSpan={5} className="border-r border-black p-2 text-center font-semibold">TOTAL VARIANCE:</td>
                  <td className={`border-r border-black p-2 text-center font-bold text-lg ${
                    data.totalVariance !== 0 ? (data.totalVariance > 0 ? 'text-green-600' : 'text-red-600') : ''
                  }`}>
                    {data.totalVariance > 0 ? '+' : ''}{data.totalVariance}
                  </td>
                  <td colSpan={3} className="p-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div className="mt-6 p-4 border border-gray-400">
            <h3 className="font-semibold mb-2">SUMMARY OF VARIANCES:</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-semibold">Overage: </span>
                <span className="text-green-600">+{data.items.filter(item => item.variance > 0).reduce((sum, item) => sum + item.variance, 0)}</span>
              </div>
              <div>
                <span className="font-semibold">Shortage: </span>
                <span className="text-red-600">{data.items.filter(item => item.variance < 0).reduce((sum, item) => sum + item.variance, 0)}</span>
              </div>
              <div>
                <span className="font-semibold">Net Variance: </span>
                <span className={data.totalVariance !== 0 ? (data.totalVariance > 0 ? 'text-green-600' : 'text-red-600') : ''}>
                  {data.totalVariance > 0 ? '+' : ''}{data.totalVariance}
                </span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6 mt-8 pt-4 border-t-2 border-black">
            <div className="text-center">
              <div className="border-b border-black mb-1 pb-8"></div>
              <p className="text-xs font-semibold">Inventory Committee Chairman</p>
            </div>
            <div className="text-center">
              <div className="border-b border-black mb-1 pb-8"></div>
              <p className="text-xs font-semibold">Property Custodian</p>
            </div>
            <div className="text-center">
              <div className="border-b border-black mb-1 pb-8"></div>
              <p className="text-xs font-semibold">Supply Officer</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};