"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Package, Clock, LogOut } from "lucide-react";
import TechShell from "@/components/TechShell";
import { fetchWithAuth } from "@/lib/auth/client";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Order } from "@/lib/supabase/types";

export default function UserOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }

      const response = await fetchWithAuth("/api/orders");
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      const json = await response.json();
      setOrders(json.orders || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "Paid":
      case "Completed":
        return "text-emerald-300 border-emerald-400/20 bg-emerald-400/10";
      case "Processing":
        return "text-sky-300 border-sky-400/20 bg-sky-400/10";
      case "Pending":
        return "text-amber-300 border-amber-400/20 bg-amber-400/10";
      case "Cancelled":
      case "Failed":
      case "Refunded":
      case "Expired":
        return "text-red-300 border-red-400/20 bg-red-400/10";
      default:
        return "text-white/70 border-white/20 bg-white/5";
    }
  }

  if (loading) {
    return <TechShell title="My Orders" subtitle="Loading your purchase history..." />;
  }

  return (
    <TechShell title="My Orders" subtitle="Track and manage your recent purchases.">
      <div className="mx-auto w-full max-w-4xl">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-white/10 bg-white/[0.02] py-20 text-center">
            <Package className="mb-4 h-10 w-10 text-white/20" />
            <p className="text-sm font-light text-white/50">You haven't placed any orders yet.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {orders.map((order) => (
              <div key={order.id} className="rounded-lg border border-white/10 bg-[#080808] p-5 shadow-sm transition-colors hover:border-white/15">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-mono text-xs text-white/50">Order #{order.id.split('-')[0]}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-white/40" />
                      <p className="text-sm text-white/80">{new Date(order.created_at).toLocaleDateString()} at {new Date(order.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 sm:items-end">
                    <p className="text-lg font-light text-white">PHP {Number(order.total_amount).toFixed(2)}</p>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-sm border px-2 py-0.5 text-[9px] uppercase tracking-widest ${getStatusColor(order.payment_status)}`}>
                        {order.payment_status}
                      </span>
                      <span className={`inline-flex rounded-sm border px-2 py-0.5 text-[9px] uppercase tracking-widest ${getStatusColor(order.order_status)}`}>
                        {order.order_status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </TechShell>
  );
}
