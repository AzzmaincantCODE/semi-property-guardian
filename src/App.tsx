import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NetworkStatus } from "@/components/ui/network-status";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient, removeOldestQuery } from "@tanstack/react-query-persist-client";
import { localforagePersister, DEFAULT_GC_TIME_MS, DEFAULT_STALE_TIME_MS, PERSIST_MAX_AGE_MS } from "@/lib/queryPersistence";
import { processOfflineQueue } from "@/lib/offlineQueue";
import { propertyCardService } from "@/services/propertyCardService";
import { simpleInventoryService } from "@/services/simpleInventoryService";
import { HashRouter, Routes, Route } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Dashboard } from "@/pages/Dashboard";
import { Inventory } from "@/pages/Inventory";
import { PropertyCards } from "@/pages/PropertyCards";
import { PropertyCardsAnnex } from "@/pages/PropertyCardsAnnex";
import { CustodianSlips } from "@/pages/CustodianSlips";
import { CustodianSlipsAnnex } from "@/pages/CustodianSlipsAnnex";
import Custodians from "@/pages/Custodians";
import { Transfers } from "@/pages/Transfers";
import { PhysicalCount } from "@/pages/PhysicalCount";
import { LossReports } from "@/pages/LossReports";
import { Reports } from "@/pages/Reports";
import Debug from "@/pages/Debug";
import Lookups from "@/pages/Lookups";
import Login from "@/pages/Login";
import NotFound from "./pages/NotFound";
import { } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // keep cached data useful offline
      staleTime: DEFAULT_STALE_TIME_MS,
      gcTime: DEFAULT_GC_TIME_MS,
      retry: 1,
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Persist cache to IndexedDB
persistQueryClient({
  queryClient,
  persister: localforagePersister,
  maxAge: PERSIST_MAX_AGE_MS,
  buster: 'v1',
  hydrateOptions: {
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME_MS,
      },
    },
  },
  dehydrateOptions: {
    shouldDehydrateMutation: () => false,
    onDeleteOldestQuery: removeOldestQuery,
  },
});

// Auth temporarily disabled: all routes are public for debugging

const App = () => (
  <ThemeProvider defaultTheme="system" storageKey="semi-property-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <HashRouter>
          <div className="min-h-screen bg-background">
            <Header />
            <NetworkStatus />
            <div className="flex">
              <Sidebar />
              <main className="flex-1 p-6">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/property-cards" element={<PropertyCardsAnnex />} />
                  <Route path="/property-cards-old" element={<PropertyCards />} />
                  <Route path="/custodian-slips" element={<CustodianSlipsAnnex />} />
                  <Route path="/custodian-slips-old" element={<CustodianSlips />} />
                  <Route path="/custodians" element={<Custodians />} />
                  <Route path="/transfers" element={<Transfers />} />
                  <Route path="/physical-count" element={<PhysicalCount />} />
                  <Route path="/loss-reports" element={<LossReports />} />
                  <Route path="/reports" element={<Reports />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/debug" element={<Debug />} />
                  <Route path="/settings/lookups" element={<Lookups />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
            </div>
          </div>
        </HashRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;

// Process offline queue when we regain connectivity
window.addEventListener('online', () => {
  processOfflineQueue({
    'propertyCards.create': async ({ card }) => {
      await propertyCardService.create(card);
    },
    'propertyCards.update': async ({ id, updates }) => {
      await propertyCardService.update(id, updates);
    },
    'propertyCards.delete': async ({ id }) => {
      await propertyCardService.delete(id);
    },
    'propertyCards.addEntry': async ({ propertyCardId, entry }) => {
      await propertyCardService.addEntry(propertyCardId, entry);
    },
    'propertyCards.updateEntry': async ({ propertyCardId, entryId, updates }) => {
      await propertyCardService.updateEntry(propertyCardId, entryId, updates);
    },
    'propertyCards.deleteEntry': async ({ propertyCardId, entryId }) => {
      await propertyCardService.deleteEntry(propertyCardId, entryId);
    },
    'inventory.create': async ({ item }) => {
      await simpleInventoryService.create(item);
    },
    'inventory.update': async ({ id, updates }) => {
      await simpleInventoryService.update(id, updates);
    },
    'inventory.delete': async ({ id }) => {
      await simpleInventoryService.delete(id);
    },
  }).then(({ processed, failed }) => {
    if (processed || failed) {
      console.log(`[offline-queue] processed=${processed} failed=${failed}`);
    }
  });
});

