import type { Product } from "@/lib/supabase/types";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  image_url: string | null;
  quantity: number;
};

const cartKey = "techbits-cart";
export const cartChangedEvent = "techbits-cart-changed";

function emitCartChanged() {
  window.dispatchEvent(new Event(cartChangedEvent));
}

export function getCartItems(): CartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(cartKey) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setCartItems(items: CartItem[]) {
  window.localStorage.setItem(cartKey, JSON.stringify(items));
  emitCartChanged();
}

export function addProductToCart(product: Product, quantity = 1) {
  const items = getCartItems();
  const existingItem = items.find((item) => item.productId === product.id);

  if (existingItem) {
    existingItem.quantity += quantity;
    setCartItems(items);
    return;
  }

  setCartItems([
    ...items,
    {
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      image_url: product.image_url,
      quantity,
    },
  ]);
}

export function getCartCount() {
  return getCartItems().reduce((total, item) => total + item.quantity, 0);
}
