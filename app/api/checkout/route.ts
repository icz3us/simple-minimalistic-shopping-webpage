import { NextRequest } from "next/server";
import { jsonError, statusFromAuthError } from "@/lib/api";
import { verifyRequestUser } from "@/lib/auth/server";
import { createPayMongoIntentWithQR } from "@/lib/paymongo";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type CartPayload = {
  productId: string;
  quantity: number;
};

export async function POST(request: NextRequest) {
  try {
    const user = await verifyRequestUser(request);

    if (user.profile.role === "admin") {
      return jsonError("Admin accounts cannot place orders.", 403);
    }

    const body = await request.json();
    const items: CartPayload[] = Array.isArray(body.items) ? body.items : [];

    if (items.length === 0) {
      return jsonError("Cart is empty.", 400);
    }

    // Validate personal & shipping info
    const customerName = String(body.customer_name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const shippingAddress = String(body.shipping_address ?? "").trim();
    const shippingCity = String(body.shipping_city ?? "").trim();
    const shippingProvince = String(body.shipping_province ?? "").trim();
    const shippingZip = String(body.shipping_zip ?? "").trim();

    if (!customerName) return jsonError("Full name is required.", 400);
    if (!phone) return jsonError("Phone number is required.", 400);
    if (!shippingAddress) return jsonError("Shipping address is required.", 400);
    if (!shippingCity) return jsonError("City is required.", 400);
    if (!shippingProvince) return jsonError("Province is required.", 400);
    if (!shippingZip) return jsonError("ZIP / Postal code is required.", 400);

    const supabase = getSupabaseAdmin();

    // Fetch all referenced products in one query
    const productIds = items.map((item) => item.productId);
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds);

    if (productsError) return jsonError(productsError.message, 500);

    const productMap = new Map(
      (products ?? []).map((product) => [product.id, product])
    );

    // Validate every cart item against actual DB data
    const orderItems: {
      product_id: string;
      product_name: string;
      product_image_url: string | null;
      rarity: string;
      price_each: number;
      quantity: number;
      subtotal: number;
    }[] = [];

    for (const item of items) {
      if (!item.productId || !Number.isInteger(item.quantity) || item.quantity < 1) {
        return jsonError("Invalid cart item.", 400);
      }

      const product = productMap.get(item.productId);
      if (!product) {
        return jsonError(`Product not found: ${item.productId}`, 400);
      }

      if (item.quantity > product.stock) {
        return jsonError(
          `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`,
          400
        );
      }

      const priceEach = Number(product.price);
      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        product_image_url: product.image_url ?? null,
        rarity: product.classification ?? "Common",
        price_each: priceEach,
        quantity: item.quantity,
        subtotal: priceEach * item.quantity,
      });
    }

    // Calculate total server-side (never trust frontend totals)
    const totalAmount = orderItems.reduce((sum, item) => sum + item.subtotal, 0);

    // Create the order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        customer_name: customerName,
        phone,
        shipping_address: shippingAddress,
        shipping_city: shippingCity,
        shipping_province: shippingProvince,
        shipping_zip: shippingZip,
        total_amount: totalAmount,
        payment_status: "Pending",
        order_status: "Pending",
      })
      .select("*")
      .single();

    if (orderError) return jsonError(orderError.message, 500);

    // Insert order items
    const itemsWithOrderId = orderItems.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(itemsWithOrderId);

    if (itemsError) {
      // Rollback: delete the order if items failed
      await supabase.from("orders").delete().eq("id", order.id);
      return jsonError(itemsError.message, 500);
    }

    // Create PayMongo Payment Intent
    let paymongoData;
    try {
      paymongoData = await createPayMongoIntentWithQR(
        totalAmount,
        customerName,
        user.profile.email || "customer@example.com",
        phone,
        `TechBits Order ${order.id}`
      );

      // Update order with PayMongo details
      await supabase
        .from("orders")
        .update({
          paymongo_payment_intent_id: paymongoData.intentId,
          paymongo_source_id: paymongoData.methodId,
        })
        .eq("id", order.id);
    } catch (pmError) {
      // If PayMongo fails, keep the order as Pending, but log the error
      console.error("PayMongo Error:", pmError);
      return jsonError("Payment gateway error. Please try again.", 502);
    }

    return Response.json(
      {
        order: {
          id: order.id,
          total_amount: order.total_amount,
          payment_status: order.payment_status,
          order_status: order.order_status,
          created_at: order.created_at,
        },
        itemCount: orderItems.length,
        checkoutUrl: paymongoData.checkoutUrl,
        intentId: paymongoData.intentId,
      },
      { status: 201 }
    );
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Unauthorized",
      statusFromAuthError(error)
    );
  }
}
