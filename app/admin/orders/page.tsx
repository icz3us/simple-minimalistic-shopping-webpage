"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown, Eye, Search, X } from "lucide-react";
import TechShell from "@/components/TechShell";
import { fetchWithAuth } from "@/lib/auth/client";
import type { Order, OrderItem, OrderStatus, PaymentStatus } from "@/lib/supabase/types";

type StatusFilter = "All" | PaymentStatus | OrderStatus;

const statusFilters: StatusFilter[] = [
  "All",
  "Pending",
  "Paid",
  "Processing",
  "Completed",
  "Cancelled",
];

const paymentOptions: PaymentStatus[] = ["Pending", "Paid", "Failed", "Refunded", "Expired"];
const orderStatusOptions: OrderStatus[] = ["Pending", "Processing", "Completed", "Cancelled"];

function statusBadgeClass(value: string) {
  switch (value) {
    case "Paid":
    case "Completed":
      return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100";
    case "Processing":
      return "border-sky-300/30 bg-sky-400/10 text-sky-100";
    case "Pending":
      return "border-amber-300/30 bg-amber-400/10 text-amber-100";
    case "Cancelled":
    case "Failed":
    case "Refunded":
    case "Expired":
      return "border-red-300/30 bg-red-400/10 text-red-100";
    default:
      return "border-white/20 bg-white/5 text-white/70";
  }
}

function StatusBadge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm border px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] ${statusBadgeClass(value)}`}
    >
      {value}
    </span>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("All");
  const [search, setSearch] = useState("");
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [detailItems, setDetailItems] = useState<OrderItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");

  async function loadOrders() {
    const response = await fetchWithAuth("/api/admin/orders");
    const data = await response.json();
    if (response.ok) setOrders(data.orders ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  async function openDetail(orderId: string) {
    setDetailLoading(true);
    setDetailOrder(null);
    setDetailItems([]);
    const response = await fetchWithAuth(`/api/admin/orders/${orderId}`);
    const data = await response.json();
    if (response.ok) {
      setDetailOrder(data.order);
      setDetailItems(data.items ?? []);
    }
    setDetailLoading(false);
  }

  function closeDetail() {
    setDetailOrder(null);
    setDetailItems([]);
  }

  async function updateOrderField(
    orderId: string,
    field: "payment_status" | "order_status",
    value: string
  ) {
    setUpdating(true);
    setMessage("");
    const response = await fetchWithAuth(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify({ [field]: value }),
    });
    const data = await response.json();
    if (response.ok) {
      setMessage("Order updated.");
      if (detailOrder?.id === orderId) {
        setDetailOrder({ ...detailOrder, ...data.order });
      }
      await loadOrders();
    } else {
      setMessage(data.error ?? "Failed to update.");
    }
    setUpdating(false);
  }

  // Filtering
  const filtered = orders.filter((order) => {
    const matchesFilter =
      filter === "All" ||
      order.payment_status === filter ||
      order.order_status === filter;

    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      order.id.toLowerCase().includes(q) ||
      (order.profiles?.email ?? "").toLowerCase().includes(q) ||
      (order.profiles?.full_name ?? "").toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return <TechShell title="Orders Management" subtitle="Loading orders..." />;
  }

  return (
    <TechShell
      title="Orders Management"
      subtitle="View and manage all customer orders."
    >
      <Link
        href="/admin"
        className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/50 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Admin
      </Link>

      {message && (
        <p className="mb-4 text-sm text-white/60">{message}</p>
      )}

      {/* Filters & Search */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`h-9 rounded-sm border px-3 text-[10px] uppercase tracking-[0.16em] transition-colors ${
                filter === s
                  ? "border-white/25 bg-white/12 text-white"
                  : "border-white/10 bg-white/[0.03] text-white/45 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, or order ID"
            className="w-full rounded-sm border border-white/10 bg-black/40 py-2.5 pl-10 pr-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/30"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["Pending", "Paid", "Processing", "Completed"] as const).map((s) => {
          const count = orders.filter(
            (o) => o.payment_status === s || o.order_status === s
          ).length;
          return (
            <div
              key={s}
              className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-center"
            >
              <p className="text-lg font-light text-white/85">{count}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/35">
                {s}
              </p>
            </div>
          );
        })}
      </div>

      {/* Orders Table (desktop) */}
      <section className="glass-panel rounded-lg bg-[#0a0a0a]/80 p-4 sm:p-6">
        <h2 className="mb-5 text-xs uppercase tracking-[0.26em] text-white/70 sm:text-sm sm:tracking-[0.3em]">
          All Orders ({filtered.length})
        </h2>

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onView={() => openDetail(order.id)}
            />
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-white/45">No orders found.</p>
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-auto md:block">
          <table className="w-full min-w-[860px] text-left text-xs text-white/55">
            <thead className="uppercase tracking-[0.2em] text-white/35">
              <tr>
                <th className="pb-3">Order ID</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Total</th>
                <th className="pb-3">Payment</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-t border-white/10">
                  <td className="py-3 font-mono text-[11px] text-white/65">
                    {order.id.slice(0, 8)}…
                  </td>
                  <td className="py-3">
                    <p className="text-white/75">
                      {order.profiles?.full_name || "—"}
                    </p>
                    <p className="text-[11px] text-white/40">
                      {order.profiles?.email || "—"}
                    </p>
                  </td>
                  <td className="py-3 text-white/75">
                    PHP {Number(order.total_amount).toFixed(2)}
                  </td>
                  <td className="py-3">
                    <StatusBadge value={order.payment_status} />
                  </td>
                  <td className="py-3">
                    <StatusBadge value={order.order_status} />
                  </td>
                  <td className="py-3">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => openDetail(order.id)}
                      className="flex h-8 items-center gap-1.5 rounded-sm border border-white/10 px-3 text-[10px] uppercase tracking-[0.16em] text-white/70 hover:border-white/20 hover:text-white"
                    >
                      <Eye className="h-3.5 w-3.5" /> View
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-white/45">
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {(detailOrder || detailLoading) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/75 p-4 pt-16 backdrop-blur-sm"
            onClick={closeDetail}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="relative w-full max-w-3xl rounded-lg border border-white/15 bg-[#080808] p-5 sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closeDetail}
                className="absolute right-4 top-4 text-white/40 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              {detailLoading ? (
                <p className="py-12 text-center text-sm text-white/45">
                  Loading order details...
                </p>
              ) : detailOrder ? (
                <OrderDetail
                  order={detailOrder}
                  items={detailItems}
                  updating={updating}
                  onUpdatePayment={(v) =>
                    updateOrderField(detailOrder.id, "payment_status", v)
                  }
                  onUpdateStatus={(v) =>
                    updateOrderField(detailOrder.id, "order_status", v)
                  }
                />
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TechShell>
  );
}

/* ─── Sub-components ─── */

function OrderCard({
  order,
  onView,
}: {
  order: Order;
  onView: () => void;
}) {
  return (
    <article className="rounded-md border border-white/10 bg-white/[0.03] p-4 text-xs text-white/55">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-white/50">
            {order.id.slice(0, 8)}…
          </p>
          <p className="mt-1 text-sm text-white/80">
            {order.profiles?.full_name || order.profiles?.email || "—"}
          </p>
        </div>
        <p className="shrink-0 text-sm text-white/75">
          PHP {Number(order.total_amount).toFixed(2)}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge value={order.payment_status} />
        <StatusBadge value={order.order_status} />
      </div>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-white/40">
          {new Date(order.created_at).toLocaleDateString()}
        </p>
        <button
          onClick={onView}
          className="flex h-8 items-center gap-1.5 rounded-sm border border-white/10 px-3 text-[10px] uppercase tracking-[0.16em] text-white/70 hover:border-white/20 hover:text-white"
        >
          <Eye className="h-3.5 w-3.5" /> View
        </button>
      </div>
    </article>
  );
}

function OrderDetail({
  order,
  items,
  updating,
  onUpdatePayment,
  onUpdateStatus,
}: {
  order: Order;
  items: OrderItem[];
  updating: boolean;
  onUpdatePayment: (v: string) => void;
  onUpdateStatus: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-white/40">
        Order Details
      </p>
      <h3 className="mt-2 text-lg font-light text-white/90">
        Order #{order.id.slice(0, 8)}
      </h3>

      {/* Customer Info */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
            Customer
          </p>
          <p className="mt-1 text-sm text-white/80">
            {order.customer_name || order.profiles?.full_name || "—"}
          </p>
          <p className="mt-0.5 text-xs text-white/50">
            {order.profiles?.email || "—"}
          </p>
          {order.phone && (
            <p className="mt-0.5 text-xs text-white/50">
              {order.phone}
            </p>
          )}
        </div>
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
            Order Date
          </p>
          <p className="mt-1 text-sm text-white/80">
            {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Shipping Address */}
      {order.shipping_address && (
        <div className="mt-4 rounded-md border border-white/10 bg-white/[0.03] p-3">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
            Shipping Address
          </p>
          <p className="mt-1 text-sm leading-5 text-white/80">
            {order.shipping_address}
          </p>
          <p className="text-sm text-white/65">
            {[order.shipping_city, order.shipping_province, order.shipping_zip]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
      )}

      {/* Status Controls */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-xs uppercase tracking-[0.18em] text-white/45">
          Payment Status
          <div className="relative mt-2">
            <select
              value={order.payment_status}
              disabled={updating}
              onChange={(e) => onUpdatePayment(e.target.value)}
              className="w-full appearance-none rounded-sm border border-white/10 bg-black/40 px-4 py-3 pr-10 text-sm normal-case tracking-normal text-white outline-none disabled:opacity-50"
            >
              {paymentOptions.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          </div>
        </label>
        <label className="text-xs uppercase tracking-[0.18em] text-white/45">
          Order Status
          <div className="relative mt-2">
            <select
              value={order.order_status}
              disabled={updating}
              onChange={(e) => onUpdateStatus(e.target.value)}
              className="w-full appearance-none rounded-sm border border-white/10 bg-black/40 px-4 py-3 pr-10 text-sm normal-case tracking-normal text-white outline-none disabled:opacity-50"
            >
              {orderStatusOptions.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          </div>
        </label>
      </div>

      {/* Ordered Items */}
      <div className="mt-6">
        <h4 className="mb-3 text-xs uppercase tracking-[0.22em] text-white/50">
          Ordered Items
        </h4>
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-[64px_1fr_auto]"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-md bg-black/50 sm:h-16 sm:w-16">
                {item.product_image_url ? (
                  <Image
                    src={item.product_image_url}
                    alt={item.product_name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-white/20">
                    T-BIT
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-white/80">{item.product_name}</p>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/45">
                  <span>Rarity: {item.rarity}</span>
                  <span>Qty: {item.quantity}</span>
                  <span>
                    PHP {Number(item.price_each).toFixed(2)} each
                  </span>
                </div>
              </div>
              <p className="text-sm text-white/75 sm:text-right">
                PHP {Number(item.subtotal).toFixed(2)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="mt-5 flex justify-end border-t border-white/10 pt-4">
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
            Total Amount
          </p>
          <p className="mt-1 text-xl font-light text-white">
            PHP {Number(order.total_amount).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
