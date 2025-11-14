import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface UnserviceableItem {
  propertyNumber: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  dateAcquired: string;
  condition: string;
  defects: string;
  recommendation: 'Repair' | 'Dispose' | 'Condemn';
  estimatedRepairCost?: number;
}

interface UnserviceableReportProps {
  data: {
    reportNumber: string;
    reportDate: string;
    department: string;
    inspectedBy: string[];
    reviewPeriod: string;
    items: UnserviceableItem[];
    totalValue: number;
  };
}

export const UnserviceableReport: React.FC<UnserviceableReportProps> = ({ data }) => {
  const handlePrint = () => {
    window.print();
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'Repair': return 'text-blue-600';
      case 'Dispose': return 'text-orange-600';
      case 'Condemn': return 'text-red-600';
      default: return '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <h2 className="text-2xl font-bold">Inventory and Inspection Report of Unserviceable Semi-Expandable Property</h2>
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      <Card className="print:shadow-none print:border-2 print:border-black">
        <CardHeader className="text-center border-b-2 border-black">
          <div className="space-y-2">
            <h1 className="text-lg font-bold uppercase">INVENTORY AND INSPECTION REPORT OF UNSERVICEABLE SEMI-EXPANDABLE PROPERTY</h1>
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
                <label className="text-xs font-semibold uppercase">Review Period:</label>
                <p className="text-sm">{data.reviewPeriod}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="border-b border-gray-400 pb-1">
                <label className="text-xs font-semibold uppercase">Inspected By:</label>
                <div className="text-sm space-y-1">
                  {data.inspectedBy.map((person, index) => (
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
                  <th className="border-r border-black p-2 text-center">Qty</th>
                  <th className="border-r border-black p-2 text-center">Unit Cost</th>
                  <th className="border-r border-black p-2 text-center">Total Cost</th>
                  <th className="border-r border-black p-2 text-center">Date Acquired</th>
                  <th className="border-r border-black p-2 text-center">Condition</th>
                  <th className="border-r border-black p-2 text-center">Defects/Issues</th>
                  <th className="border-r border-black p-2 text-center">Recommendation</th>
                  <th className="p-2 text-center">Estimated Repair Cost</th>
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
                    <td className="border-r border-black p-2 text-right">₱{item.totalCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                    <td className="border-r border-black p-2 text-center">{item.dateAcquired}</td>
                    <td className="border-r border-black p-2 text-center">{item.condition}</td>
                    <td className="border-r border-black p-2">{item.defects}</td>
                    <td className={`border-r border-black p-2 text-center font-semibold ${getRecommendationColor(item.recommendation)}`}>
                      {item.recommendation}
                    </td>
                    <td className="p-2 text-right">
                      {item.estimatedRepairCost ? `₱${item.estimatedRepairCost.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-black bg-gray-100">
                  <td colSpan={5} className="border-r border-black p-2 text-center font-semibold">TOTAL VALUE OF UNSERVICEABLE PROPERTY:</td>
                  <td className="border-r border-black p-2 text-right font-bold text-lg text-orange-600">
                    ₱{data.totalValue.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </td>
                  <td colSpan={5} className="p-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-3 gap-4 p-4 border border-gray-400">
              <div className="text-center">
                <p className="font-semibold text-blue-600">FOR REPAIR</p>
                <p className="text-2xl font-bold">
                  {data.items.filter(item => item.recommendation === 'Repair').length}
                </p>
                <p className="text-sm text-gray-600">items</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-orange-600">FOR DISPOSAL</p>
                <p className="text-2xl font-bold">
                  {data.items.filter(item => item.recommendation === 'Dispose').length}
                </p>
                <p className="text-sm text-gray-600">items</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-red-600">FOR CONDEMNATION</p>
                <p className="text-2xl font-bold">
                  {data.items.filter(item => item.recommendation === 'Condemn').length}
                </p>
                <p className="text-sm text-gray-600">items</p>
              </div>
            </div>
            
            <div className="p-4 border border-gray-400">
              <h3 className="font-semibold mb-4">INSPECTOR'S NOTES:</h3>
              <div className="space-y-2 text-sm">
                <div className="border-b border-gray-200 pb-8">
                  <p className="text-xs text-gray-500 mb-2">Additional observations and recommendations:</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6 mt-8 pt-4 border-t-2 border-black">
            <div className="text-center">
              <div className="border-b border-black mb-1 pb-8"></div>
              <p className="text-xs font-semibold">Inspection Committee Chairman</p>
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