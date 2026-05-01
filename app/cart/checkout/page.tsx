"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, MapPin, Package, ShieldCheck, User, XCircle } from "lucide-react";
import TechShell from "@/components/TechShell";
import { fetchWithAuth } from "@/lib/auth/client";
import { CartItem, cartChangedEvent, getCartItems, setCartItems } from "@/lib/cart";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/supabase/types";

type ModalState =
  | { type: "success"; orderId: string; total: number }
  | { type: "payment"; checkoutUrl: string; qrImageUrl: string; intentId: string; orderId: string; total: number }
  | { type: "error"; message: string }
  | null;

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [polling, setPolling] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);

  // Personal & shipping form
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingProvince, setShippingProvince] = useState("");
  const [shippingZip, setShippingZip] = useState("");

  useEffect(() => {
    async function loadSession() {
      const { data } = await supabaseBrowser.auth.getSession();
      const hasSession = Boolean(data.session);
      setIsLoggedIn(hasSession);

      if (!hasSession) {
        router.replace("/login");
        return;
      }

      const response = await fetchWithAuth("/api/me");
      const result = await response.json();
      if (response.ok) {
        setUserRole(result.profile?.role ?? null);
        if (result.profile?.role === "admin") {
          router.replace("/admin");
          return;
        }
      } else {
        router.replace("/login");
        return;
      }

      setCheckingAuth(false);
    }

    loadSession();

    const cartItems = getCartItems();
    if (cartItems.length === 0 && !modal) {
      router.replace("/cart");
      return;
    }
    setItems(cartItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const totalItems = items.reduce((total, item) => total + item.quantity, 0);

  async function placeOrder() {
    if (placing || items.length === 0) return;

    // Client-side validation
    if (!customerName.trim()) { setModal({ type: "error", message: "Please enter your full name." }); return; }
    if (!phone.trim()) { setModal({ type: "error", message: "Please enter your phone number." }); return; }
    if (!shippingAddress.trim()) { setModal({ type: "error", message: "Please enter your shipping address." }); return; }
    if (!shippingCity.trim()) { setModal({ type: "error", message: "Please enter your city." }); return; }
    if (!shippingProvince.trim()) { setModal({ type: "error", message: "Please enter your province." }); return; }
    if (!shippingZip.trim()) { setModal({ type: "error", message: "Please enter your ZIP / postal code." }); return; }

    setPlacing(true);

    try {
      const payload = {
        customer_name: customerName.trim(),
        phone: phone.trim(),
        shipping_address: shippingAddress.trim(),
        shipping_city: shippingCity.trim(),
        shipping_province: shippingProvince.trim(),
        shipping_zip: shippingZip.trim(),
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      const response = await fetchWithAuth("/api/checkout", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setModal({ type: "error", message: data.error ?? "Unable to place order." });
        setPlacing(false);
        return;
      }

      setModal({
        type: "payment",
        checkoutUrl: data.checkoutUrl,
        qrImageUrl: data.qrImageUrl,
        intentId: data.intentId,
        orderId: data.order.id,
        total: Number(data.order.total_amount),
      });
    } catch {
      setModal({ type: "error", message: "Something went wrong. Please try again." });
    } finally {
      setPlacing(false);
    }
  }

  // 3-second Auto-Polling for payment success
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    async function checkStatus(intentId: string) {
      try {
        const response = await fetchWithAuth(`/api/checkout/payment/${intentId}`);
        const data = await response.json();
        
        if (response.ok && data.status === "Paid") {
          setCartItems([]);
          window.dispatchEvent(new Event(cartChangedEvent));
          setModal(prev => prev?.type === "payment" ? {
            type: "success",
            orderId: prev.orderId,
            total: prev.total,
          } : prev);
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }

    if (modal?.type === "payment") {
      intervalId = setInterval(() => {
        checkStatus(modal.intentId);
      }, 3000);
    }

    return () => clearInterval(intervalId);
  }, [modal]);

  async function handleIHavePaid(intentId: string) {
    if (polling) return;
    setPolling(true);
    try {
      const response = await fetchWithAuth(`/api/checkout/payment/${intentId}`);
      const data = await response.json();
      
      if (response.ok && data.status === "Paid") {
        // Clear cart
        setCartItems([]);
        window.dispatchEvent(new Event(cartChangedEvent));
        
        // Show success
        if (modal && modal.type === "payment") {
          setModal({
            type: "success",
            orderId: modal.orderId,
            total: modal.total,
          });
        }
      } else {
        alert("Payment not yet confirmed. Please try again in a few seconds.");
      }
    } catch (error) {
      alert("Error checking payment status.");
    } finally {
      setPolling(false);
    }
  }

  function handleCancelPayment() {
    setModal(null);
    // Note: We leave the order as Pending. Customer can try checkout again if they want, 
    // but we won't show the same QR. (A new checkout creates a new pending order).
  }

  if (checkingAuth) {
    return <TechShell title="Checkout" subtitle="Verifying access..." />;
  }

  if (!isLoggedIn || userRole === "admin") {
    return null;
  }

  return (
    <TechShell title="Checkout" subtitle="Review your order before placing it.">
      {/* Back to cart link */}
      <Link
        href="/cart"
        className="mb-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/50 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Cart
      </Link>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:gap-6">
        <div className="space-y-5">
          {/* Personal Information */}
          <section className="glass-panel rounded-lg bg-[#0a0a0a]/80 p-4 sm:p-6">
            <h2 className="mb-5 flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-white/70 sm:text-sm sm:tracking-[0.3em]">
              <User className="h-4 w-4" /> Personal Information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs uppercase tracking-[0.18em] text-white/45">
                Full Name *
                <input
                  id="checkout-name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Juan Dela Cruz"
                  className="mt-2 w-full rounded-sm border border-white/10 bg-black/40 px-4 py-3 text-sm normal-case tracking-normal text-white outline-none placeholder:text-white/25 focus:border-white/30"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.18em] text-white/45">
                Phone Number *
                <input
                  id="checkout-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09171234567"
                  className="mt-2 w-full rounded-sm border border-white/10 bg-black/40 px-4 py-3 text-sm normal-case tracking-normal text-white outline-none placeholder:text-white/25 focus:border-white/30"
                />
              </label>
            </div>
          </section>

          {/* Shipping Address */}
          <section className="glass-panel rounded-lg bg-[#0a0a0a]/80 p-4 sm:p-6">
            <h2 className="mb-5 flex items-center gap-2 text-xs uppercase tracking-[0.26em] text-white/70 sm:text-sm sm:tracking-[0.3em]">
              <MapPin className="h-4 w-4" /> Shipping Address
            </h2>
            <div className="grid gap-4">
              <label className="text-xs uppercase tracking-[0.18em] text-white/45">
                Street Address *
                <input
                  id="checkout-address"
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  placeholder="123 Main Street, Barangay Example"
                  className="mt-2 w-full rounded-sm border border-white/10 bg-black/40 px-4 py-3 text-sm normal-case tracking-normal text-white outline-none placeholder:text-white/25 focus:border-white/30"
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-3">
                <label className="text-xs uppercase tracking-[0.18em] text-white/45">
                  City *
                  <input
                    id="checkout-city"
                    value={shippingCity}
                    onChange={(e) => setShippingCity(e.target.value)}
                    placeholder="Manila"
                    className="mt-2 w-full rounded-sm border border-white/10 bg-black/40 px-4 py-3 text-sm normal-case tracking-normal text-white outline-none placeholder:text-white/25 focus:border-white/30"
                  />
                </label>
                <label className="text-xs uppercase tracking-[0.18em] text-white/45">
                  Province *
                  <input
                    id="checkout-province"
                    value={shippingProvince}
                    onChange={(e) => setShippingProvince(e.target.value)}
                    placeholder="Metro Manila"
                    className="mt-2 w-full rounded-sm border border-white/10 bg-black/40 px-4 py-3 text-sm normal-case tracking-normal text-white outline-none placeholder:text-white/25 focus:border-white/30"
                  />
                </label>
                <label className="text-xs uppercase tracking-[0.18em] text-white/45">
                  ZIP Code *
                  <input
                    id="checkout-zip"
                    value={shippingZip}
                    onChange={(e) => setShippingZip(e.target.value)}
                    placeholder="1000"
                    className="mt-2 w-full rounded-sm border border-white/10 bg-black/40 px-4 py-3 text-sm normal-case tracking-normal text-white outline-none placeholder:text-white/25 focus:border-white/30"
                  />
                </label>
              </div>
            </div>
          </section>

          {/* Order Items */}
          <section className="glass-panel rounded-lg bg-[#0a0a0a]/80 p-4 sm:p-6">
            <h2 className="mb-5 text-xs uppercase tracking-[0.26em] text-white/70 sm:text-sm sm:tracking-[0.3em]">
              Order Summary
            </h2>

          <div className="space-y-4">
            {items.map((item) => (
              <article
                key={item.productId}
                className="grid gap-4 rounded-md border border-white/10 bg-white/[0.03] p-4 sm:grid-cols-[80px_1fr_auto]"
              >
                {/* Product Image */}
                <div className="relative aspect-square w-full overflow-hidden rounded-md bg-black/50 sm:h-20 sm:w-20">
                  {item.image_url ? (
                    <Image src={item.image_url} alt={item.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-[0.24em] text-white/20">
                      T-BIT
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="min-w-0">
                  <p className="text-sm uppercase tracking-[0.18em] text-white/80">{item.name}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <dt className="uppercase tracking-[0.18em] text-white/30">Price</dt>
                      <dd className="mt-0.5 text-white/65">PHP {item.price.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt className="uppercase tracking-[0.18em] text-white/30">Qty</dt>
                      <dd className="mt-0.5 text-white/65">{item.quantity}</dd>
                    </div>
                  </dl>
                </div>

                {/* Subtotal */}
                <div className="flex items-start sm:items-center">
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">Subtotal</p>
                    <p className="mt-0.5 text-sm text-white/80">
                      PHP {(item.price * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>
              </article>
            ))}

            {items.length === 0 && (
              <div className="rounded-md border border-white/10 bg-white/[0.03] p-6 text-sm text-white/45">
                Your cart is empty.
              </div>
            )}
          </div>
        </section>
      </div>

        {/* Payment Summary Sidebar */}
        <aside className="glass-panel h-fit rounded-lg bg-[#0a0a0a]/80 p-4 sm:p-6">
          <h2 className="mb-5 text-xs uppercase tracking-[0.26em] text-white/70 sm:text-sm sm:tracking-[0.3em]">
            Payment Details
          </h2>

          <div className="space-y-4 text-sm text-white/55">
            <div className="flex justify-between">
              <span>Items</span>
              <span className="text-white/80">{totalItems}</span>
            </div>
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-white/80">PHP {subtotal.toFixed(2)}</span>
            </div>
            <div className="border-t border-white/10 pt-4">
              <div className="flex justify-between text-base">
                <span className="text-white/70">Total</span>
                <span className="font-light text-white">PHP {subtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Security Badge */}
          <div className="mt-5 flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-3 py-2.5">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-300/60" />
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">
              Payment via QRPh (PayMongo)
            </p>
          </div>

          {/* Place Order Button */}
          <button
            id="place-order-button"
            disabled={placing || items.length === 0}
            onClick={placeOrder}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 bg-white text-xs uppercase tracking-[0.22em] text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {placing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Processing...
              </>
            ) : (
              <>
                <Package className="h-4 w-4" /> Place Order
              </>
            )}
          </button>
        </aside>
      </div>

      {/* Success / Error Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 22, stiffness: 220 }}
              className={`relative w-full max-w-md overflow-hidden rounded-lg border bg-[#080808] p-6 text-center ${
                modal.type === "success"
                  ? "border-emerald-300/25 shadow-[0_0_60px_rgba(52,211,153,0.12)]"
                  : modal.type === "payment"
                  ? "border-sky-300/25 shadow-[0_0_60px_rgba(56,189,248,0.12)]"
                  : "border-red-200/25 shadow-[0_0_60px_rgba(248,113,113,0.12)]"
              }`}
            >
              {modal.type === "payment" ? (
                <div className="relative z-10">
                  <h3 className="text-xl font-light text-white">Complete Payment</h3>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    Scan the QR code below using any QRPh supported app (GCash, Maya, etc).
                  </p>
                  
                  {/* QR Image Display */}
                  <div className="mt-6 mb-6 flex justify-center">
                    {modal.qrImageUrl ? (
                      <div className="overflow-hidden rounded-lg border-2 border-white/20 bg-white p-2">
                        <img 
                          src={modal.qrImageUrl} 
                          alt="QRPh Code" 
                          className="h-48 w-48 object-contain"
                        />
                      </div>
                    ) : modal.checkoutUrl ? (
                      <a 
                        href={modal.checkoutUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-flex h-12 items-center justify-center rounded-md bg-white px-6 text-sm font-medium text-black transition hover:bg-white/90"
                      >
                        Open Payment Page
                      </a>
                    ) : (
                      <p className="text-sm text-amber-200/50">Generating QR code...</p>
                    )}
                  </div>

                  <div className="mt-4 rounded-md border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                      Order Reference
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-white/75">
                      {modal.orderId}
                    </p>
                    <p className="mt-2 text-sm text-white/65">
                      Amount: PHP {modal.total.toFixed(2)}
                    </p>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="flex h-11 items-center justify-center gap-2 bg-sky-500/10 border border-sky-500/20 text-[10px] sm:text-xs uppercase tracking-[0.18em] text-sky-300">
                      <Loader2 className="h-4 w-4 animate-spin" /> Auto-checking...
                    </div>
                    <button
                      onClick={handleCancelPayment}
                      className="flex h-11 items-center justify-center bg-white/10 text-xs uppercase tracking-[0.18em] text-white/75 hover:bg-white/15"
                    >
                      Cancel Payment
                    </button>
                  </div>
                </div>
              ) : modal.type === "success" ? (
                <div className="relative z-10">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-300/20 bg-emerald-400/10">
                    <CheckCircle2 className="h-8 w-8 text-emerald-300" />
                  </div>
                  <h3 className="mt-5 text-2xl font-light text-white">Order Placed!</h3>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    Your order has been placed successfully.
                  </p>
                  <div className="mt-4 rounded-md border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                      Order Reference
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-white/75">
                      {modal.orderId}
                    </p>
                    <p className="mt-2 text-sm text-white/65">
                      Total: PHP {modal.total.toFixed(2)}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-amber-200/50">
                      Payment Status: Pending
                    </p>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <Link
                      href="/dashboard"
                      className="flex h-11 items-center justify-center bg-white/10 text-xs uppercase tracking-[0.18em] text-white/75 hover:bg-white/15"
                    >
                      My Dashboard
                    </Link>
                    <Link
                      href="/"
                      className="flex h-11 items-center justify-center bg-white text-xs uppercase tracking-[0.18em] text-black hover:bg-white/85"
                    >
                      Continue Shopping
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-red-300/20 bg-red-400/10">
                    <XCircle className="h-8 w-8 text-red-300" />
                  </div>
                  <h3 className="mt-5 text-xl font-light text-red-100">Order Failed</h3>
                  <p className="mt-3 text-sm leading-6 text-white/60">{modal.message}</p>
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="mt-6 h-11 w-full bg-white/10 text-xs uppercase tracking-[0.18em] text-white/75 hover:bg-white/15"
                  >
                    Close
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TechShell>
  );
}
