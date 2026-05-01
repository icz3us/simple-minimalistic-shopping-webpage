const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;

function getAuthHeaders() {
  if (!PAYMONGO_SECRET_KEY) {
    throw new Error("Missing PAYMONGO_SECRET_KEY");
  }
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ":").toString("base64")}`,
  };
}

export async function createPayMongoIntentWithQR(
  amount: number, // in PHP, not cents
  customerName: string,
  customerEmail: string,
  phone: string,
  description: string
) {
  const amountInCents = Math.round(amount * 100);

  // 1. Create Payment Intent
  const intentRes = await fetch("https://api.paymongo.com/v1/payment_intents", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      data: {
        attributes: {
          amount: amountInCents,
          payment_method_allowed: ["qrph"],
          payment_method_options: {
            qrph: {
              request_3ds: "any",
            },
          },
          currency: "PHP",
          capture_type: "automatic",
          description,
        },
      },
    }),
  });

  if (!intentRes.ok) {
    const errorText = await intentRes.text();
    throw new Error(`Failed to create Payment Intent: ${errorText}`);
  }
  const intentData = await intentRes.json();
  const intentId = intentData.data.id;

  // 2. Create Payment Method
  const methodRes = await fetch("https://api.paymongo.com/v1/payment_methods", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      data: {
        attributes: {
          type: "qrph",
          billing: {
            name: customerName,
            email: customerEmail || "customer@example.com",
            phone: phone || "09171234567",
          },
        },
      },
    }),
  });

  if (!methodRes.ok) {
    const errorText = await methodRes.text();
    throw new Error(`Failed to create Payment Method: ${errorText}`);
  }
  const methodData = await methodRes.json();
  const methodId = methodData.data.id;

  // 3. Attach Payment Method to Intent
  const attachRes = await fetch(
    `https://api.paymongo.com/v1/payment_intents/${intentId}/attach`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        data: {
          attributes: {
            payment_method: methodId,
            return_url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/cart/checkout?intent=${intentId}`,
          },
        },
      }),
    }
  );

  if (!attachRes.ok) {
    const errorText = await attachRes.text();
    throw new Error(`Failed to attach Payment Method: ${errorText}`);
  }
  const attachData = await attachRes.json();
  const nextAction = attachData.data.attributes.next_action;

  // For QRPh, next_action usually contains a redirect URL or a direct display URL
  const checkoutUrl =
    nextAction?.redirect?.url || nextAction?.url || "";

  return {
    intentId,
    methodId,
    checkoutUrl,
  };
}

export async function getPayMongoIntent(intentId: string) {
  const res = await fetch(`https://api.paymongo.com/v1/payment_intents/${intentId}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error("Failed to fetch Payment Intent");
  }
  return res.json();
}
