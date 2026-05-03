import { NextRequest } from "next/server";
import crypto from "crypto";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("Paymongo-Signature");
    const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;

    if (!signatureHeader || !webhookSecret) {
      return new Response("Missing signature or secret", { status: 400 });
    }

    // Parse the signature header
    // e.g. "t=160000000,te=test_signature,li=live_signature"
    const sigParts = signatureHeader.split(",");
    let t = "";
    let te = "";
    let li = "";

    for (const part of sigParts) {
      const [key, value] = part.split("=");
      if (key === "t") t = value;
      if (key === "te") te = value;
      if (key === "li") li = value;
    }

    const signatureToUse = process.env.NODE_ENV === "production" ? li : (te || li);

    if (!t || !signatureToUse) {
      return new Response("Invalid signature format", { status: 400 });
    }

    // Compute expected signature
    const signaturePayload = `${t}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(signaturePayload)
      .digest("hex");

    // Secure compare
    if (expectedSignature !== signatureToUse) {
      return new Response("Invalid signature", { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const event = payload.data.attributes.type;
    const paymentData = payload.data.attributes.data;

    const supabase = getSupabaseAdmin();

    if (event === "payment.paid") {
      // We can also find by intent ID, but webhook often doesn't bubble up intent easily unless it's in payment data.
      // Usually payment object has `source_id` if it came from a source. Wait, for payment intent, it's `paymentData.attributes.payment_intent_id`.
      const paymentIntentId = paymentData.attributes.payment_intent_id;

      if (!paymentIntentId) {
        return new Response("OK", { status: 200 }); // Ignored, not an intent
      }

      // Find order
      const { data: order } = await supabase
        .from("orders")
        .select("*")
        .eq("paymongo_payment_intent_id", paymentIntentId)
        .single();

      if (order && order.payment_status !== "Paid") {
        await supabase
          .from("orders")
          .update({
            payment_status: "Paid",
            order_status: "Processing",
            paid_at: new Date().toISOString(),
          })
          .eq("id", order.id);

        await supabase.from("payments").insert({
          order_id: order.id,
          user_id: order.user_id,
          provider: "paymongo",
          method: "qrph",
          amount: order.total_amount,
          status: "Paid",
          provider_reference: paymentIntentId,
        });

        // Deduct stock safely
        const { data: items } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", order.id);

        if (items) {
          for (const item of items) {
            if (!item.product_id) continue;

            const { error: stockError } = await supabase.rpc("decrement_stock", {
              p_product_id: item.product_id,
              p_quantity: item.quantity,
            });

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
    } else if (event === "payment.failed") {
      const paymentIntentId = paymentData.attributes.payment_intent_id;
      if (paymentIntentId) {
        await supabase
          .from("orders")
          .update({
            payment_status: "Failed",
          })
          .eq("paymongo_payment_intent_id", paymentIntentId);
      }
    }

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Webhook Error", { status: 500 });
  }
}
