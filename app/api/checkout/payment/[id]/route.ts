import { NextRequest } from "next/server";
import { jsonError, statusFromAuthError } from "@/lib/api";
import { verifyRequestUser } from "@/lib/auth/server";
import { getPayMongoIntent } from "@/lib/paymongo";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { OrderStatus, PaymentStatus } from "@/lib/supabase/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const user = await verifyRequestUser(request);
    const { id: intentId } = await params;

    const supabase = getSupabaseAdmin();

    // 1. Find the order by intentId
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("paymongo_payment_intent_id", intentId)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      return jsonError("Order not found or unauthorized.", 404);
    }

    // If already paid in our DB, just return
    if (order.payment_status === "Paid") {
      return Response.json({ status: "Paid", orderId: order.id });
    }

    // 2. Fetch latest status from PayMongo
    const intentData = await getPayMongoIntent(intentId);
    const pmStatus = intentData.data.attributes.status; // e.g. "succeeded", "awaiting_payment_method", "processing"

    let newPaymentStatus: PaymentStatus = order.payment_status;
    let newOrderStatus: OrderStatus = order.order_status;

    if (pmStatus === "succeeded") {
      newPaymentStatus = "Paid";
      newOrderStatus = "Processing";

      // Mark order as paid
      await supabase
        .from("orders")
        .update({
          payment_status: newPaymentStatus,
          order_status: newOrderStatus,
          paid_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      // Create Payment record
      const paymentsQuery = await supabase.from("payments").select("id").eq("order_id", order.id).single();
      if (!paymentsQuery.data) {
        await supabase.from("payments").insert({
          order_id: order.id,
          user_id: order.user_id,
          provider: "paymongo",
          method: "qrph",
          amount: order.total_amount,
          status: "Paid",
          provider_reference: intentId,
        });

        // Deduct stock safely (assuming order_items hasn't changed)
        const { data: items } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", order.id);

        if (items) {
          for (const item of items) {
            const { error: stockError } = await supabase.rpc("decrement_stock", {
              p_product_id: item.product_id,
              p_quantity: item.quantity,
            });

            // If RPC doesn't exist, fall back to direct update
            if (stockError) {
              const { data: product } = await supabase
                .from("products")
                .select("stock")
                .eq("id", item.product_id)
                .single();

              if (product) {
                await supabase
                  .from("products")
                  .update({ stock: Math.max(product.stock - item.quantity, 0) })
                  .eq("id", item.product_id);
              }
            }
          }
        }
      }
    } else if (pmStatus === "cancelled") {
      newPaymentStatus = "Failed";
      newOrderStatus = "Cancelled";
      await supabase
        .from("orders")
        .update({
          payment_status: newPaymentStatus,
          order_status: newOrderStatus,
        })
        .eq("id", order.id);
    }

    return Response.json({ status: newPaymentStatus, orderId: order.id });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unauthorized",
      statusFromAuthError(error)
    );
  }
}
