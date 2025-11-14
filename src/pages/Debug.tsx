import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type PingResult = {
  step: string;
  ok: boolean;
  info?: string;
  error?: string;
};

export default function Debug() {
  const [results, setResults] = useState<PingResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMsg, setAuthMsg] = useState<string | null>(null);

  const runChecks = async () => {
      const r: PingResult[] = [];
      try {
        r.push({ step: "env:VITE_SUPABASE_URL", ok: !!import.meta.env.VITE_SUPABASE_URL, info: String(import.meta.env.VITE_SUPABASE_URL || "<missing>") });
        r.push({ step: "env:VITE_SUPABASE_ANON_KEY", ok: !!import.meta.env.VITE_SUPABASE_ANON_KEY, info: import.meta.env.VITE_SUPABASE_ANON_KEY ? "<present>" : "<missing>" });

        const { data: ver, error: verErr } = await supabase.from("property_cards").select("id").limit(1);
        if (verErr) {
          r.push({ step: "db:select property_cards", ok: false, error: verErr.message });
        } else {
          r.push({ step: "db:select property_cards", ok: true, info: `${ver?.length || 0} rows accessible` });
        }

        const session = (await supabase.auth.getSession()).data.session;
        r.push({ step: "auth:session", ok: !!session, info: session ? `user ${session.user.id}` : "no session" });

        // Attempt an insert in a safe throwaway way using a ROLLBACK-able transaction surrogate: we just try and then delete if successful
        const testPayload = {
          entity_name: "Debug Entity",
          fund_cluster: "101",
          semi_expendable_property: "Debug Item",
          property_number: `DBG-${Date.now()}`,
          description: "Debug connectivity",
          date_acquired: new Date().toISOString().slice(0, 10),
          remarks: "debug",
        };

        const insertRes = await supabase.from("property_cards").insert(testPayload).select("id").single();
        if (insertRes.error) {
          r.push({ step: "db:insert property_cards", ok: false, error: insertRes.error.message });
        } else {
          r.push({ step: "db:insert property_cards", ok: true, info: `id ${insertRes.data.id}` });
          // cleanup
          await supabase.from("property_cards").delete().eq("id", insertRes.data.id);
        }
      } catch (e: any) {
        r.push({ step: "unexpected", ok: false, error: e?.message || String(e) });
      } finally {
        setResults(r);
        setLoading(false);
      }
  };

  useEffect(() => {
    runChecks();
  }, []);

  const handleSignIn = async () => {
    setAuthMsg(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setAuthMsg(error ? error.message : "Signed in");
    await runChecks();
  };

  const handleSignOut = async () => {
    setAuthMsg(null);
    setLoading(true);
    await supabase.auth.signOut();
    setAuthMsg("Signed out");
    await runChecks();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Supabase Debug</h1>
      <div className="text-sm text-muted-foreground">Visit this page to verify environment, connectivity, auth session, and RLS inserts.</div>
      <div className="rounded border p-4 space-y-3">
        <div className="font-medium">Auth test</div>
        <div className="flex gap-2 flex-wrap items-center">
          <input className="border rounded px-2 py-1" placeholder="email" value={email} onChange={e => setEmail(e.target.value)} />
          <input className="border rounded px-2 py-1" placeholder="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <button className="border rounded px-3 py-1" onClick={handleSignIn}>Sign in</button>
          <button className="border rounded px-3 py-1" onClick={handleSignOut}>Sign out</button>
        </div>
        {authMsg && <div className="text-xs text-muted-foreground">{authMsg}</div>}
      </div>
      {loading ? (
        <div>Running checks…</div>
      ) : (
        <div className="space-y-2">
          {results.map((x, idx) => (
            <div key={idx} className={`rounded border p-3 ${x.ok ? "border-green-500/40 bg-green-500/5" : "border-red-500/40 bg-red-500/5"}`}>
              <div className="font-medium">{x.step}</div>
              {x.info && <div className="text-xs mt-1">{x.info}</div>}
              {x.error && <div className="text-xs mt-1 text-red-600">{x.error}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


