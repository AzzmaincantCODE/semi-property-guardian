import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { lookupService, LookupItem } from "@/services/lookupService";
import { useToast } from "@/hooks/use-toast";

export default function Lookups() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState<LookupItem[]>([]);
  const [fundSources, setFundSources] = useState<LookupItem[]>([]);
  const [departments, setDepartments] = useState<LookupItem[]>([]);
  const [custodians, setCustodians] = useState<LookupItem[]>([]);
  const [semiExpandableCategories, setSemiExpandableCategories] = useState<LookupItem[]>([]);
  const [query, setQuery] = useState("");
  
  // Get active tab from URL hash, default to suppliers
  const activeTab = location.hash ? location.hash.substring(1) : 'suppliers';
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    navigate(`${location.pathname}#${value}`, { replace: true });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, f, d, c, sec] = await Promise.all([
        lookupService.getSuppliers(),
        lookupService.getFundSources(),
        lookupService.getDepartments(),
        lookupService.getCustodians(),
        lookupService.getSemiExpandableCategories(),
      ]);
      setSuppliers(s);
      setFundSources(f);
      setDepartments(d);
      setCustodians(c);
      setSemiExpandableCategories(sec);
    } catch (e: any) {
      toast({ title: "Failed to load lookups", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filter = (items: LookupItem[]) => items.filter(x => (x.name || "").toLowerCase().includes(query.toLowerCase()) || (x.code || "").toLowerCase().includes(query.toLowerCase()));

  type TableName = 'suppliers' | 'fund_sources' | 'departments' | 'custodians' | 'semi_expandable_categories';

  const useCrud = (table: TableName, items: LookupItem[], setItems: (x: LookupItem[]) => void) => {
    const [mode, setMode] = useState<'idle' | 'create' | 'edit'>("idle");
    const [editing, setEditing] = useState<LookupItem | null>(null);
    const [form, setForm] = useState<{ name: string; code?: string }>({ name: "" });
    const hasCode = table === 'fund_sources' || table === 'departments' || table === 'custodians' || table === 'semi_expandable_categories';
    const codeRequired = table === 'fund_sources';
    const startCreate = () => { setMode('create'); setEditing(null); setForm(hasCode ? { name: "", code: "" } : { name: "" }); };
    const startEdit = (item: LookupItem) => { setMode('edit'); setEditing(item); setForm(hasCode ? { name: item.name, code: item.code } : { name: item.name }); };
    const cancel = () => { setMode('idle'); setEditing(null); setForm({ name: "", code: "" }); };
    const save = async () => {
      if (mode === 'edit' && editing) {
        const updated = await lookupService.update(table, editing.id, form);
        setItems(items.map(i => i.id === editing.id ? updated : i));
      } else if (mode === 'create') {
        const created = await lookupService.create(table, form);
        setItems([created, ...items]);
      }
      cancel();
    };
    const remove = async (id: string) => {
      await lookupService.remove(table, id);
      setItems(items.filter(i => i.id !== id));
    };
    return { mode, editing, form, setForm, startCreate, startEdit, save, remove, cancel, hasCode, codeRequired };
  };

  const Section = ({ title, items, table, setItems }: { title: string; items: LookupItem[]; table: TableName; setItems: (x: LookupItem[]) => void }) => {
    const { mode, editing, form, setForm, startCreate, startEdit, save, remove, cancel, hasCode, codeRequired } = useCrud(table, items, setItems);

    // Helpers for showing existing custodian numbers and suggested next
    const existingCustodianNos = useMemo(() => {
      if (table !== 'custodians') return [] as string[];
      // Exclude the item currently being edited to avoid false duplicate detection
      const sourceItems = editing ? items.filter(i => i.id !== editing.id) : items;
      const codes = (sourceItems || [])
        .map(i => (i.code || '').trim())
        .filter(Boolean);
      // sort by numeric part desc
      const withNum = codes.map(c => ({ c, n: (c.match(/\d+/) ? parseInt((c.match(/\d+/) as RegExpMatchArray)[0], 10) : NaN) }));
      withNum.sort((a, b) => (isFinite(b.n as number) ? (b.n as number) : -1) - (isFinite(a.n as number) ? (a.n as number) : -1));
      return withNum.map(x => x.c);
    }, [table, items, editing]);

    const suggestedNextCustodianNo = useMemo(() => {
      if (table !== 'custodians') return '';
      const nums = existingCustodianNos
        .map(s => (s.match(/\d+/) ? parseInt((s.match(/\d+/) as RegExpMatchArray)[0], 10) : NaN))
        .filter(n => Number.isFinite(n)) as number[];
      const next = (nums.length ? Math.max(...nums) + 1 : 1);
      return `CUST-${String(next).padStart(4, '0')}`;
    }, [table, existingCustodianNos]);

    const isDuplicateCustodianNo = useMemo(() => {
      if (table !== 'custodians') return false;
      const val = (form.code || '').trim();
      if (!val) return false;
      // consider both normalized and raw numeric duplicates
      const numeric = (val.match(/\d+/) ? (val.match(/\d+/) as RegExpMatchArray)[0] : val).padStart(4, '0');
      const normalized = `CUST-${numeric}`;
      return existingCustodianNos.includes(val) || existingCustodianNos.includes(normalized);
    }, [table, form.code, existingCustodianNos]);

    return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <div className="flex gap-2">
            <Input placeholder="Search" value={query} onChange={e => setQuery(e.target.value)} />
            <Button variant="outline" onClick={loadData} disabled={loading}>Refresh</Button>
            <Button onClick={startCreate}>Add</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {(mode !== 'idle') && (
          <div className="mb-4 p-3 border rounded grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            {hasCode && (
              <Input 
                placeholder={
                  table === 'custodians'
                    ? 'Custodian No (auto if blank)'
                    : codeRequired
                      ? 'Code (required)'
                      : 'Code (optional)'
                }
                value={form.code || ""}
                onChange={e => setForm({ ...form, code: e.target.value })}
                required={codeRequired}
              />
            )}
            {table === 'custodians' && mode === 'create' && (
              <div className="flex items-center gap-2">
                <Button variant="outline" type="button" onClick={() => setForm({ ...form, code: suggestedNextCustodianNo })}>
                  Use suggested
                </Button>
                {isDuplicateCustodianNo && (
                  <span className="text-xs text-red-600">This number already exists</span>
                )}
              </div>
            )}
            {table === 'custodians' && (
              <div className="text-xs text-muted-foreground col-span-1 md:col-span-3">
                <div className="flex flex-wrap gap-2 items-center mt-1">
                  <span>Existing Nos:</span>
                  <span className="max-w-full truncate">
                    {existingCustodianNos.slice(0, 12).join(', ') || 'None yet'}
                    {existingCustodianNos.length > 12 ? '…' : ''}
                  </span>
                  <span className="ml-2">Suggested next:</span>
                  <span className="font-medium">{suggestedNextCustodianNo}</span>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button 
                onClick={save} 
                disabled={!form.name.trim() || (codeRequired && !form.code?.trim()) || (table === 'custodians' && isDuplicateCustodianNo)}
              >
                Save
              </Button>
              <Button variant="outline" onClick={cancel}>Cancel</Button>
            </div>
          </div>
        )}
        <div className="rounded border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-64">Name</TableHead>
                {hasCode && <TableHead>Code</TableHead>}
                <TableHead className="w-40 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filter(items).map(item => (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  {hasCode && <TableCell>{item.code || ""}</TableCell>}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(item)}>Edit</Button>
                      <Button variant="destructive" size="sm" onClick={() => remove(item.id)}>Delete</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filter(items).length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">No records</div>
          )}
        </div>
      </CardContent>
    </Card>
  ); };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings · Lookups</h1>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="fundSources">Fund Sources</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="custodians">Custodians</TabsTrigger>
          <TabsTrigger value="semiExpandableCategories">Semi Expandable Categories</TabsTrigger>
        </TabsList>
        <TabsContent value="suppliers"><Section title="Suppliers" items={suppliers} table="suppliers" setItems={setSuppliers} /></TabsContent>
        <TabsContent value="fundSources"><Section title="Fund Sources" items={fundSources} table="fund_sources" setItems={setFundSources} /></TabsContent>
        <TabsContent value="departments"><Section title="Departments" items={departments} table="departments" setItems={setDepartments} /></TabsContent>
        <TabsContent value="custodians">
          <Section title="Custodians" items={custodians} table="custodians" setItems={setCustodians} />
          {custodians.length === 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> If you don't see any custodians, make sure to run the SQL setup script in Supabase first. 
                Check the <code>database/custodians-setup.sql</code> file for the complete setup.
              </p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="semiExpandableCategories">
          <Section title="Semi Expandable Categories" items={semiExpandableCategories} table="semi_expandable_categories" setItems={setSemiExpandableCategories} />
        </TabsContent>
      </Tabs>
    </div>
  );
}


