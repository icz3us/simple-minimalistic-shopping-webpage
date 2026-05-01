export type UserRole = "user" | "admin";
export type Classification = "Common" | "Uncommon" | "Rare" | "Legendary";
export type QrStatus = "active" | "sold_out" | "disabled";
export type ClaimScanStatus = "success" | "rejected" | "sold_out";

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

export type QrCode = {
  id: string;
  character_id: string;
  qr_value: string;
  status: QrStatus;
  created_at: string;
};

export type ClaimScan = {
  id: string;
  user_id: string | null;
  character_id: string | null;
  qr_code_id: string | null;
  qr_value: string;
  status: ClaimScanStatus;
  reason: string | null;
  created_at: string;
};

export type CollectionItem = {
  id: string;
  user_id: string;
  character_id: string;
  qr_code_id: string;
  claimed_at: string;
  techbits_characters: TechBitsCharacter | null;
};

export const classifications: Classification[] = [
  "Common",
  "Uncommon",
  "Rare",
  "Legendary",
];
