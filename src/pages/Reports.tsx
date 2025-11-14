import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Calendar, BarChart3, TrendingUp, Package, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ReportGenerator } from "@/components/reports/ReportGenerator";

interface Report {
  id: string;
  name: string;
  type: "Inventory Summary" | "Property Ledger" | "Transfer Report" | "Physical Count Summary" | "Loss Report Summary" | "Unserviceable Report" | "Custodian Report";
  description: string;
  lastGenerated?: string;
  frequency: "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Annual" | "On-Demand";
  status: "Available" | "Generating" | "Scheduled";
}

const availableReports: Report[] = [
  {
    id: "1",
    name: "Inventory Summary Report",
    type: "Inventory Summary",
    description: "Complete overview of all semi-expandable property items with their current status, location, and condition",
    frequency: "Monthly",
    status: "Available"
  },
  {
    id: "2",
    name: "Issued vs Unissued Items Report",
    type: "Inventory Summary",
    description: "Detailed breakdown of issued and unissued items with assignment status and custodian information",
    frequency: "Weekly",
    status: "Available"
  },
  {
    id: "3",
    name: "Semi-Expendable Property Ledger",
    type: "Property Ledger",
    description: "Detailed ledger showing all property movements, acquisitions, transfers, and disposals",
    frequency: "Quarterly",
    status: "Available"
  },
  {
    id: "4",
    name: "Property Transfer Summary",
    type: "Transfer Report",
    description: "Summary of all property transfers between departments including pending and completed transfers",
    frequency: "Monthly",
    status: "Available"
  },
  {
    id: "5",
    name: "Custodian Information Report",
    type: "Custodian Report",
    description: "Comprehensive report showing all items and records for each custodian, including current assignments and historical data",
    frequency: "Weekly",
    status: "Available"
  },
  {
    id: "6",
    name: "Physical Count Variance Report",
    type: "Physical Count Summary",
    description: "Analysis of physical count results showing variances between expected and actual quantities",
    frequency: "Annual",
    status: "Generating"
  },
  {
    id: "5",
    name: "Loss and Damage Summary",
    type: "Loss Report Summary",
    description: "Comprehensive report of lost, stolen, damaged, or destroyed property with financial impact",
    frequency: "Quarterly",
    status: "Available"
  },
  {
    id: "6",
    name: "Unserviceable Property Report",
    type: "Unserviceable Report",
    description: "Report on property items that are unserviceable and recommendations for disposal or repair",
    frequency: "Monthly",
    status: "Available"
  },
  {
    id: "7",
    name: "Custodian Accountability Report",
    type: "Custodian Report",
    description: "Report showing property assigned to each custodian and their current accountability status",
    frequency: "Quarterly",
    status: "Scheduled"
  }
];

export const Reports = () => {
  const [reports] = useState<Report[]>(availableReports);
  const [filterType, setFilterType] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [selectedDepartment, setSelectedDepartment] = useState<string>("All");
  const { toast } = useToast();

  const handleGenerateReport = (report: Report) => {
    // Report generation is now handled by ReportGenerator component
    toast({
      title: "Report Generated",
      description: `${report.name} is ready for viewing`,
    });
  };

  const handleDownloadReport = (report: Report) => {
    toast({
      title: "Download Started",
      description: `Downloading ${report.name}...`
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Available": return "success";
      case "Generating": return "warning";
      case "Scheduled": return "secondary";
      default: return "secondary";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "Inventory Summary": return <Package className="h-5 w-5" />;
      case "Property Ledger": return <FileText className="h-5 w-5" />;
      case "Transfer Report": return <TrendingUp className="h-5 w-5" />;
      case "Physical Count Summary": return <BarChart3 className="h-5 w-5" />;
      case "Loss Report Summary": return <AlertTriangle className="h-5 w-5" />;
      case "Unserviceable Report": return <AlertTriangle className="h-5 w-5" />;
      case "Custodian Report": return <FileText className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const filteredReports = reports.filter(report => {
    const typeMatch = filterType === "All" || report.type === filterType;
    const statusMatch = filterStatus === "All" || report.status === filterStatus;
    return typeMatch && statusMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
        <Button className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Schedule Report
        </Button>
      </div>

      {/* Report Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label>Report Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Types</SelectItem>
                  <SelectItem value="Inventory Summary">Inventory Summary</SelectItem>
                  <SelectItem value="Property Ledger">Property Ledger</SelectItem>
                  <SelectItem value="Transfer Report">Transfer Report</SelectItem>
                  <SelectItem value="Physical Count Summary">Physical Count</SelectItem>
                  <SelectItem value="Loss Report Summary">Loss Report</SelectItem>
                  <SelectItem value="Unserviceable Report">Unserviceable</SelectItem>
                  <SelectItem value="Custodian Report">Custodian Report</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="Generating">Generating</SelectItem>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Department</Label>
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Departments</SelectItem>
                  <SelectItem value="IT">IT Department</SelectItem>
                  <SelectItem value="HR">Human Resources</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Date Range</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({...dateRange, from: e.target.value})}
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({...dateRange, to: e.target.value})}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available Reports</p>
                <p className="text-2xl font-bold">{reports.filter(r => r.status === "Available").length}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Generating</p>
                <p className="text-2xl font-bold">{reports.filter(r => r.status === "Generating").length}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
                <p className="text-2xl font-bold">{reports.filter(r => r.status === "Scheduled").length}</p>
              </div>
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Reports</p>
                <p className="text-2xl font-bold">{reports.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredReports.map((report) => (
          <Card key={report.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getTypeIcon(report.type)}
                  <div>
                    <CardTitle className="text-lg">{report.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{report.type}</p>
                  </div>
                </div>
                <Badge variant={getStatusColor(report.status) as any}>
                  {report.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{report.description}</p>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Frequency:</span>
                  <span className="font-medium">{report.frequency}</span>
                </div>
                {report.lastGenerated && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Generated:</span>
                    <span className="font-medium">{report.lastGenerated}</span>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <ReportGenerator
                  reportType={report.type}
                  reportName={report.name}
                  trigger={
                    <Button
                      className="flex-1"
                      disabled={report.status === "Generating"}
                    >
                      {report.status === "Generating" ? "Generating..." : "Generate"}
                    </Button>
                  }
                />
                <Button
                  onClick={() => handleDownloadReport(report)}
                  variant="outline"
                  size="icon"
                  disabled={report.status !== "Available"}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Report Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Report Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ReportGenerator
              reportType="Property Card"
              reportName="Custom Property Card"
              trigger={
                <div className="p-4 border border-border rounded-lg hover:bg-muted cursor-pointer transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <Package className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">Custom Property Card</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Generate a semi-expandable property card with specific property details</p>
                </div>
              }
            />
            
            <ReportGenerator
              reportType="Property Ledger"
              reportName="Property Ledger Card"
              trigger={
                <div className="p-4 border border-border rounded-lg hover:bg-muted cursor-pointer transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">Property Ledger Card</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Generate detailed property ledger showing all movements and transactions</p>
                </div>
              }
            />
            
            <ReportGenerator
              reportType="Custodian Report"
              reportName="Inventory Custodian Slip"
              trigger={
                <div className="p-4 border border-border rounded-lg hover:bg-muted cursor-pointer transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <h3 className="font-medium">Custodian Slip</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">Generate inventory custodian slip for property accountability</p>
                </div>
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};