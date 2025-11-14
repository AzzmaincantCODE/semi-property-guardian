import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface LedgerEntry {
  date: string;
  referenceNumber: string;
  received: number;
  issued: number;
  balance: number;
  recipient: string;
}

interface PropertyLedgerCardProps {
  data: {
    propertyNumber: string;
    description: string;
    unit: string;
    entries: LedgerEntry[];
  };
}

export const PropertyLedgerCard: React.FC<PropertyLedgerCardProps> = ({ data }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4 print:hidden">
        <h2 className="text-2xl font-bold">Semi-Expandable Property Ledger Card</h2>
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Print
        </Button>
      </div>

      <Card className="print:shadow-none print:border-2 print:border-black">
        <CardHeader className="text-center border-b-2 border-black">
          <div className="space-y-2">
            <h1 className="text-xl font-bold uppercase">SEMI-EXPANDABLE PROPERTY LEDGER CARD</h1>
            <p className="text-sm">Republic of the Philippines</p>
            <p className="text-sm font-semibold">[Department/Agency Name]</p>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="border-b border-gray-400 pb-1">
              <label className="text-xs font-semibold uppercase">Property Number:</label>
              <p className="font-mono text-lg">{data.propertyNumber}</p>
            </div>
            <div className="border-b border-gray-400 pb-1">
              <label className="text-xs font-semibold uppercase">Description:</label>
              <p className="text-sm">{data.description}</p>
            </div>
            <div className="border-b border-gray-400 pb-1">
              <label className="text-xs font-semibold uppercase">Unit:</label>
              <p className="text-sm">{data.unit}</p>
            </div>
          </div>
          
          <div className="border-2 border-black">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="border-r border-black p-2 text-center">Date</th>
                  <th className="border-r border-black p-2 text-center">Reference Number</th>
                  <th className="border-r border-black p-2 text-center">Received</th>
                  <th className="border-r border-black p-2 text-center">Issued</th>
                  <th className="border-r border-black p-2 text-center">Balance</th>
                  <th className="p-2 text-center">Recipient/Issuer</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry, index) => (
                  <tr key={index} className="border-b border-gray-300">
                    <td className="border-r border-black p-2 text-center">{entry.date}</td>
                    <td className="border-r border-black p-2 text-center">{entry.referenceNumber}</td>
                    <td className="border-r border-black p-2 text-center">{entry.received || '-'}</td>
                    <td className="border-r border-black p-2 text-center">{entry.issued || '-'}</td>
                    <td className="border-r border-black p-2 text-center font-semibold">{entry.balance}</td>
                    <td className="p-2">{entry.recipient}</td>
                  </tr>
                ))}
                {/* Empty rows for future entries */}
                {Array.from({ length: Math.max(0, 10 - data.entries.length) }).map((_, index) => (
                  <tr key={`empty-${index}`} className="border-b border-gray-300">
                    <td className="border-r border-black p-2 h-8">&nbsp;</td>
                    <td className="border-r border-black p-2">&nbsp;</td>
                    <td className="border-r border-black p-2">&nbsp;</td>
                    <td className="border-r border-black p-2">&nbsp;</td>
                    <td className="border-r border-black p-2">&nbsp;</td>
                    <td className="p-2">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mt-8 pt-4 border-t-2 border-black">
            <div className="text-center">
              <div className="border-b border-black mb-1 pb-8"></div>
              <p className="text-xs font-semibold">Supply Officer</p>
            </div>
            <div className="text-center">
              <div className="border-b border-black mb-1 pb-8"></div>
              <p className="text-xs font-semibold">Property Custodian</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};