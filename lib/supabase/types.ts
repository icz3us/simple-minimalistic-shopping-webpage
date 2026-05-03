export type UserRole = "user" | "admin";
export type Classification = "Common" | "Uncommon" | "Rare" | "Legendary";
export type UnitStatus = "unclaimed" | "claimed" | "disabled";
export type ClaimScanStatus = "success" | "rejected" | "sold_out";
export type PaymentStatus = "Pending" | "Paid" | "Failed" | "Refunded" | "Expired";
export type OrderStatus = "Pending" | "Processing" | "Completed" | "Cancelled";

export type Product = {
  id: string;
  name: string;
  description: string;
  details: string;
  price: number;
  stock: number;
  image_url: string | null;
  classification: Classification;
  created_at: string;
  updated_at: string;
};

export type TechBitsCharacter = {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  classification: Classification;
  price: number;
  total_quantity: number;
  claimed_quantity: number;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
};

export type ProductUnit = {
  id: string;
  product_id: string;
  serial_number: number;
  total_quantity: number;
  display_number: string;
  qr_token: string;
  qr_image_url: string | null;
  status: UnitStatus;
  claimed_by: string | null;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ClaimScan = {
  id: string;
  user_id: string | null;
  character_id: string | null;
  product_unit_id: string | null;
  qr_value: string;
  status: ClaimScanStatus;
  reason: string | null;
  created_at: string;
};

export type CollectionItem = {
  id: string;
  user_id: string;
  character_id: string;
  product_unit_id: string;
  product_units?: ProductUnit | null;
  claimed_at: string;
  techbits_characters: TechBitsCharacter | null;
};

export const classifications: Classification[] = [
  "Common",
  "Uncommon",
  "Rare",
  "Legendary",
];

export type Order = {
  id: string;
  user_id: string;
  customer_name: string;
  phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_province: string;
  shipping_zip: string;
  total_amount: number;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  paymongo_payment_intent_id?: string | null;
  paymongo_source_id?: string | null;
  paymongo_reference?: string | null;
  paid_at?: string | null;
  created_at: string;
  updated_at: string;
  profiles?: Pick<Profile, "email" | "full_name"> | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_image_url: string | null;
  rarity: string;
  price_each: number;
  quantity: number;
  subtotal: number;
  created_at: string;
};
