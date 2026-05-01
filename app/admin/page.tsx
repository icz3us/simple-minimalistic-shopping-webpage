"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Boxes, Download, LogOut, QrCodeIcon, RefreshCw, Save, ShoppingBag, Sparkles, Trash2, Users } from "lucide-react";
import ClassificationBadge from "@/components/ClassificationBadge";
import TechShell from "@/components/TechShell";
import { fetchWithAuth } from "@/lib/auth/client";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Classification, Product, Profile, QrCode, TechBitsCharacter, UserRole } from "@/lib/supabase/types";
import { classifications } from "@/lib/supabase/types";

type FormState = {
  id?: string;
  name: string;
  description: string;
  details?: string;
  image_url: string;
  image_file?: File | null;
  image_preview_url?: string;
  classification: Classification;
  quantity?: string;
  price?: string;
  stock?: string;
};

const blankCharacter: FormState = { name: "", description: "", image_url: "", classification: "Common", quantity: "1", price: "0" };
const blankProduct: FormState = { name: "", description: "", details: "", image_url: "", classification: "Common", price: "0", stock: "0" };

type QrRow = QrCode & {
  techbits_characters?: {
    name: string;
    classification: Classification;
    total_quantity?: number;
    claimed_quantity?: number;
  } | null;
};

type QrClaimant = {
  id: string;
  user_id: string;
  claimed_at: string;
  profiles: {
    email: string;
    full_name: string | null;
  } | null;
};

type CharacterQrRow = TechBitsCharacter & {
  qrCode?: QrRow;
};

type AdminView = "characters" | "products" | "qr" | "users";

export default function AdminPage() {
  const router = useRouter();
  const [characters, setCharacters] = useState<TechBitsCharacter[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [qrCodes, setQrCodes] = useState<QrRow[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [characterForm, setCharacterForm] = useState<FormState>(blankCharacter);
  const [productForm, setProductForm] = useState<FormState>(blankProduct);
  const [activeClaimantQrId, setActiveClaimantQrId] = useState<string | null>(null);
  const [claimantsByQr, setClaimantsByQr] = useState<Record<string, QrClaimant[]>>({});
  const [loadingClaimantsQrId, setLoadingClaimantsQrId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<AdminView>("characters");

  const charactersWithQrCodes: CharacterQrRow[] = characters.map((character) => ({
    ...character,
    qrCode: qrCodes.find((qr) => qr.character_id === character.id),
  }));
  const listedProduct = products[0] ?? null;

  async function loadInitialData() {
    await refreshAll();
    setLoading(false);
  }

  async function refreshAll() {
    const [productsResponse, charactersResponse, qrResponse, usersResponse] = await Promise.all([
      fetch("/api/products"),
      fetchWithAuth("/api/admin/characters"),
      fetchWithAuth("/api/admin/qr-codes"),
      fetchWithAuth("/api/admin/users"),
    ]);
    const [productsData, charactersData, qrData, usersData] = await Promise.all([
      productsResponse.json(),
      charactersResponse.json(),
      qrResponse.json(),
      usersResponse.json(),
    ]);

    if (productsResponse.ok) setProducts(productsData.products);
    if (charactersResponse.ok) {
      setCharacters(charactersData.characters);
    }
    if (qrResponse.ok) setQrCodes(qrData.qrCodes);
    if (usersResponse.ok) setUsers(usersData.users);
  }

  async function saveCharacter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving character...");
    const image_url = await uploadFormImage(characterForm);
    if (image_url === null) return;

    const path = characterForm.id ? `/api/admin/characters/${characterForm.id}` : "/api/admin/characters";
    const response = await fetchWithAuth(path, {
      method: characterForm.id ? "PUT" : "POST",
      body: JSON.stringify({ ...characterForm, image_url, image_file: undefined, image_preview_url: undefined }),
    });
    const data = await response.json();
    setMessage(response.ok ? "Character saved." : data.error ?? "Unable to save character.");
    if (response.ok) {
      setCharacterForm(blankCharacter);
      await refreshAll();
    }
  }

  async function deleteCharacter(id: string) {
    setMessage("Deleting character...");
    const response = await fetchWithAuth(`/api/admin/characters/${id}`, { method: "DELETE" });
    const data = await response.json();
    setMessage(response.ok ? "Character deleted." : data.error ?? "Unable to delete character.");
    if (response.ok) await refreshAll();
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Saving product...");
    const image_url = await uploadFormImage(productForm);
    if (image_url === null) return;

    const productId = productForm.id || listedProduct?.id;
    const path = productId ? `/api/products/${productId}` : "/api/products";
    const response = await fetchWithAuth(path, {
      method: productId ? "PUT" : "POST",
      body: JSON.stringify({ ...productForm, image_url, image_file: undefined, image_preview_url: undefined }),
    });
    const data = await response.json();
    setMessage(response.ok ? "Product saved." : data.error ?? "Unable to save product.");
    if (response.ok) {
      setProductForm(blankProduct);
      await refreshAll();
    }
  }

  async function deleteProduct(id: string) {
    setMessage("Deleting product...");
    const response = await fetchWithAuth(`/api/products/${id}`, { method: "DELETE" });
    const data = await response.json();
    setMessage(response.ok ? "Product deleted." : data.error ?? "Unable to delete product.");
    if (response.ok) await refreshAll();
  }

  async function openClaimantsModal(qrId: string) {
    setActiveClaimantQrId(qrId);

    if (claimantsByQr[qrId]) return;

    setLoadingClaimantsQrId(qrId);
    const response = await fetchWithAuth(`/api/admin/qr-codes/${qrId}/claims`);
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Unable to load claimants.");
      setLoadingClaimantsQrId(null);
      return;
    }

    setClaimantsByQr((current) => ({
      ...current,
      [qrId]: data.claimants ?? [],
    }));
    setLoadingClaimantsQrId(null);
  }

  function closeClaimantsModal() {
    setActiveClaimantQrId(null);
  }

  async function updateUserRole(id: string, role: UserRole) {
    setMessage("Updating user role...");
    const response = await fetchWithAuth(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
    const data = await response.json();

    setMessage(response.ok ? "User role updated." : data.error ?? "Unable to update user role.");
    if (response.ok) await refreshAll();
  }

  async function signOut() {
    await supabaseBrowser.auth.signOut();
    router.replace("/login");
  }

  async function uploadFormImage(form: FormState) {
    if (!form.image_file) return form.image_url;

    setMessage("Uploading image...");
    const uploadBody = new FormData();
    uploadBody.set("file", form.image_file);

    const response = await fetchWithAuth("/api/admin/uploads", {
      method: "POST",
      body: uploadBody,
    });
    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error ?? "Unable to upload image.");
      return null;
    }

    return String(data.secure_url ?? "");
  }

  useEffect(() => {
    // Initial admin hydration has to run after Supabase restores the browser session.
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeQr = activeClaimantQrId
    ? qrCodes.find((qr) => qr.id === activeClaimantQrId) ?? null
    : null;

  if (loading) return <TechShell title="Admin Dashboard" subtitle="Loading admin controls..." />;

  return (
    <TechShell title="Admin Dashboard" subtitle="Manage TechBits products, character collectibles, QR batches, and claims.">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {message && <p className="text-sm text-white/60">{message}</p>}
        <div className="flex flex-wrap gap-3 sm:ml-auto">
          <button onClick={refreshAll} className="flex h-10 items-center gap-2 px-4 text-xs uppercase tracking-widest text-white/55 hover:text-white">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button onClick={signOut} className="flex h-10 items-center gap-2 px-4 text-xs uppercase tracking-widest text-white/55 hover:text-white">
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <ViewButton active={activeView === "characters"} icon={<Sparkles className="h-4 w-4" />} label="Characters" onClick={() => setActiveView("characters")} />
        <ViewButton active={activeView === "products"} icon={<Boxes className="h-4 w-4" />} label="Products" onClick={() => setActiveView("products")} />
        <ViewButton active={activeView === "qr"} icon={<QrCodeIcon className="h-4 w-4" />} label="QR Codes" onClick={() => setActiveView("qr")} />
        <ViewButton active={activeView === "users"} icon={<Users className="h-4 w-4" />} label="Users" onClick={() => setActiveView("users")} />
        <Link
          href="/admin/orders"
          className="flex min-h-12 items-center justify-center gap-2 border border-white/10 bg-white/[0.03] px-2 py-3 text-[10px] uppercase tracking-[0.16em] text-white/45 transition-colors hover:text-white sm:px-4 sm:text-xs sm:tracking-[0.2em]"
        >
          <ShoppingBag className="h-4 w-4" />
          Orders
        </Link>
      </div>

      {activeView === "characters" && (
        <section className="grid min-w-0 gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:gap-6">
          <AdminForm title={characterForm.id ? "Edit Character" : "Create Character"} onSubmit={saveCharacter}>
            <Fields form={characterForm} setForm={setCharacterForm} includeClassification includeCommerce={false} includeCharacterInventory={!characterForm.id} />
          </AdminForm>

          <div className="glass-panel min-w-0 overflow-hidden rounded-lg bg-[#0a0a0a]/80 p-4 sm:p-6">
            <h2 className="mb-5 text-xs uppercase tracking-[0.26em] text-white/70 sm:text-sm sm:tracking-[0.3em]">Created Characters</h2>
            <div className="space-y-3">
              {charactersWithQrCodes.map((character) => (
                <CharacterRegistryRow
                  key={character.id}
                  character={character}
                  onEdit={() => setCharacterForm({
                    id: character.id,
                    name: character.name,
                    description: character.description,
                    image_url: character.image_url ?? "",
                    image_file: null,
                    image_preview_url: "",
                    classification: character.classification,
                    price: String(character.price ?? 0),
                    quantity: String(character.total_quantity ?? 1),
                  })}
                  onDelete={() => deleteCharacter(character.id)}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {activeView === "products" && (
        <section className="grid min-w-0 gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:gap-6">
          <AdminForm title={productForm.id || listedProduct ? "Edit Product" : "Create Product"} onSubmit={saveProduct}>
            <Fields form={productForm} setForm={setProductForm} includeClassification={false} includeCommerce includeCharacterInventory={false} />
          </AdminForm>

          <div className="glass-panel min-w-0 overflow-hidden rounded-lg bg-[#0a0a0a]/80 p-4 sm:p-6">
            <h2 className="mb-5 text-xs uppercase tracking-[0.26em] text-white/70 sm:text-sm sm:tracking-[0.3em]">Product Listing</h2>
            <div className="space-y-3">
              {listedProduct && (
                <RegistryRow
                  title={`${listedProduct.name} - PHP ${Number(listedProduct.price).toFixed(2)}`}
                  subtitle={`${listedProduct.description} Stock: ${listedProduct.stock}`}
                  imageUrl={listedProduct.image_url}
                  onEdit={() => setProductForm({
                    ...listedProduct,
                    details: listedProduct.details ?? "",
                    image_url: listedProduct.image_url ?? "",
                    image_file: null,
                    image_preview_url: "",
                    price: String(listedProduct.price),
                    stock: String(listedProduct.stock),
                  })}
                  onDelete={() => deleteProduct(listedProduct.id)}
                />
              )}
              {!listedProduct && <p className="text-sm text-white/45">No product listing yet.</p>}
            </div>
          </div>
        </section>
      )}

      {activeView === "qr" && (
        <section>
          <div className="glass-panel min-w-0 overflow-hidden rounded-lg bg-[#0a0a0a]/80 p-4 sm:p-6">
            <h2 className="mb-5 text-xs uppercase tracking-[0.26em] text-white/70 sm:text-sm sm:tracking-[0.3em]">QR Claims</h2>
            <div className="space-y-3 md:hidden">
              {qrCodes.map((qr) => (
                <QrClaimCard
                  key={qr.id}
                  qr={qr}
                  onViewClaimants={() => void openClaimantsModal(qr.id)}
                />
              ))}
              {qrCodes.length === 0 && <p className="text-sm text-white/45">No QR claims yet.</p>}
            </div>
            <div className="hidden max-h-[520px] overflow-auto md:block">
              <table className="w-full min-w-[920px] text-left text-xs text-white/55">
                <thead className="uppercase tracking-[0.2em] text-white/35">
                  <tr>
                    <th className="pb-3">Character</th>
                    <th className="pb-3">QR Value</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Claimed</th>
                    <th className="pb-3">Remaining</th>
                    <th className="pb-3">Claimants</th>
                  </tr>
                </thead>
                <tbody>
                  {qrCodes.map((qr) => (
                    <tr key={qr.id} className="border-t border-white/10">
                      <td className="py-3 text-white/75">{qr.techbits_characters?.name ?? "Unknown"}</td>
                      <td className="py-3 font-mono">{qr.qr_value}</td>
                      <td className="py-3">{formatQrStatus(qr.status)}</td>
                      <td className="py-3">{qr.techbits_characters?.claimed_quantity ?? 0} / {qr.techbits_characters?.total_quantity ?? 0}</td>
                      <td className="py-3">{Math.max((qr.techbits_characters?.total_quantity ?? 0) - (qr.techbits_characters?.claimed_quantity ?? 0), 0)}</td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => void openClaimantsModal(qr.id)}
                          className="h-8 rounded-sm border border-white/10 px-3 text-[10px] uppercase tracking-[0.16em] text-white/70 hover:border-white/20 hover:text-white"
                        >
                          View Users
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {activeView === "users" && (
        <section className="glass-panel min-w-0 overflow-hidden rounded-lg bg-[#0a0a0a]/80 p-4 sm:p-6">
          <h2 className="mb-5 text-xs uppercase tracking-[0.26em] text-white/70 sm:text-sm sm:tracking-[0.3em]">User Management</h2>
          <div className="space-y-3 md:hidden">
            {users.map((user) => (
              <UserRoleCard key={user.id} user={user} onChangeRole={updateUserRole} />
            ))}
            {users.length === 0 && <p className="text-sm text-white/45">No users found.</p>}
          </div>
          <div className="hidden overflow-auto md:block">
            <table className="w-full min-w-[720px] text-left text-xs text-white/55">
              <thead className="uppercase tracking-[0.2em] text-white/35">
                <tr>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-white/10">
                    <td className="py-3 text-white/75">{user.email}</td>
                    <td className="py-3">{user.full_name || "-"}</td>
                    <td className="py-3">
                      <select
                        value={user.role}
                        onChange={(event) => updateUserRole(user.id, event.target.value as UserRole)}
                        className="rounded-sm border border-white/10 bg-black/40 px-3 py-2 text-xs uppercase tracking-[0.14em] text-white outline-none"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="py-3">{new Date(user.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <ClaimantsModal
        qr={activeQr}
        claimants={activeClaimantQrId ? claimantsByQr[activeClaimantQrId] ?? [] : []}
        loading={loadingClaimantsQrId === activeClaimantQrId}
        onClose={closeClaimantsModal}
      />
    </TechShell>
  );
}

function ViewButton({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-12 items-center justify-center gap-2 border px-2 py-3 text-[10px] uppercase tracking-[0.16em] transition-colors sm:px-4 sm:text-xs sm:tracking-[0.2em] ${
        active ? "border-white/25 bg-white/12 text-white" : "border-white/10 bg-white/[0.03] text-white/45 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function AdminForm({ title, onSubmit, children }: { title: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void; children: React.ReactNode }) {
  return (
    <form onSubmit={onSubmit} className="glass-panel min-w-0 overflow-hidden rounded-lg bg-[#0a0a0a]/80 p-4 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs uppercase tracking-[0.26em] text-white/70 sm:text-sm sm:tracking-[0.3em]">{title}</h2>
        <button className="flex h-10 items-center gap-2 bg-white/10 px-4 text-xs uppercase tracking-[0.18em] hover:bg-white/15">
          <Save className="h-4 w-4" /> Save
        </button>
      </div>
      {children}
    </form>
  );
}

function Fields({
  form,
  setForm,
  includeClassification,
  includeCommerce,
  includeCharacterInventory,
}: {
  form: FormState;
  setForm: (form: FormState) => void;
  includeClassification: boolean;
  includeCommerce: boolean;
  includeCharacterInventory: boolean;
}) {
  return (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <Input label="Name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
      <ImageUploadField form={form} setForm={setForm} />
      {includeClassification && (
        <label className="min-w-0 text-xs uppercase tracking-[0.22em] text-white/45">
          Rarity
          <select value={form.classification} onChange={(event) => setForm({ ...form, classification: event.target.value as Classification })} className="mt-2 w-full min-w-0 rounded-sm border border-white/10 bg-black/40 px-4 py-3 text-sm normal-case tracking-normal text-white outline-none">
            {classifications.map((classification) => <option key={classification}>{classification}</option>)}
          </select>
        </label>
      )}
      {includeCommerce && (
        <>
          <Input label="Price" value={form.price ?? "0"} type="number" onChange={(value) => setForm({ ...form, price: value })} />
          <Input label="Stock" value={form.stock ?? "0"} type="number" onChange={(value) => setForm({ ...form, stock: value })} />
        </>
      )}
      {includeCharacterInventory && (
        <>
          <Input label="Quantity Available" value={form.quantity ?? "1"} type="number" min="1" max="500" onChange={(value) => setForm({ ...form, quantity: value })} />
          <Input label="Price" value={form.price ?? "0"} type="number" min="0" onChange={(value) => setForm({ ...form, price: value })} />
        </>
      )}
      <label className="min-w-0 text-xs uppercase tracking-[0.22em] text-white/45 sm:col-span-2">
        Description
        <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 min-h-28 w-full min-w-0 rounded-sm border border-white/10 bg-black/40 px-4 py-3 text-sm normal-case tracking-normal text-white outline-none" />
      </label>
      {includeCommerce && (
        <label className="min-w-0 text-xs uppercase tracking-[0.22em] text-white/45 sm:col-span-2">
          Product Details
          <textarea value={form.details ?? ""} onChange={(event) => setForm({ ...form, details: event.target.value })} className="mt-2 min-h-28 w-full min-w-0 rounded-sm border border-white/10 bg-black/40 px-4 py-3 text-sm normal-case tracking-normal text-white outline-none" />
        </label>
      )}
    </div>
  );
}

function ImageUploadField({ form, setForm }: { form: FormState; setForm: (form: FormState) => void }) {
  const previewUrl = form.image_preview_url || form.image_url;
  const selectedFileName = form.image_file?.name ?? (form.image_url ? "Current image" : "No file selected");

  return (
    <label className="min-w-0 text-xs uppercase tracking-[0.22em] text-white/45">
      <span>Image</span>
      <input
        type="file"
        accept="image/*"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          if (form.image_preview_url?.startsWith("blob:")) {
            URL.revokeObjectURL(form.image_preview_url);
          }

          setForm({
            ...form,
            image_file: file,
            image_preview_url: file ? URL.createObjectURL(file) : "",
          });
          event.target.value = "";
        }}
        className="peer sr-only"
      />
      <span className="mt-2 flex min-h-12 w-full min-w-0 items-center gap-3 rounded-sm border border-white/10 bg-black/40 px-3 py-3 normal-case tracking-normal text-white">
        <span className="shrink-0 bg-white/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-white sm:text-xs">
          Choose File
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-white/55 sm:text-sm">
          {selectedFileName}
        </span>
      </span>
      {previewUrl && (
        <div className="mt-3 overflow-hidden rounded-md border border-white/10 bg-black/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Upload preview" className="h-40 w-full object-cover" />
        </div>
      )}
    </label>
  );
}

function Input({ label, value, onChange, type = "text", min, max }: { label: string; value: string; type?: string; min?: string; max?: string; onChange: (value: string) => void }) {
  return (
    <label className="min-w-0 text-xs uppercase tracking-[0.22em] text-white/45">
      {label}
      <input value={value} type={type} min={min} max={max} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full min-w-0 rounded-sm border border-white/10 bg-black/40 px-4 py-3 text-sm normal-case tracking-normal text-white outline-none" />
    </label>
  );
}

function RegistryRow({ title, subtitle, imageUrl, classification, onEdit, onDelete }: { title: string; subtitle: string; imageUrl: string | null; classification?: Classification; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="grid gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3 sm:grid-cols-[80px_1fr_auto] sm:gap-4">
      <div className="relative aspect-square w-full overflow-hidden rounded-md bg-black/50 sm:h-20 sm:w-20">
        {imageUrl ? <Image src={imageUrl} alt={title} fill className="object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] text-white/20">T-BIT</div>}
      </div>
      <div className="min-w-0">
        {classification && <ClassificationBadge value={classification} />}
        <h3 className="mt-2 truncate text-sm text-white/85">{title}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-white/45">{subtitle}</p>
      </div>
      <div className="flex gap-2 sm:flex-col">
        <button onClick={onEdit} className="p-2 text-white/45 hover:text-white" type="button"><Save className="h-4 w-4" /></button>
        <button onClick={onDelete} className="p-2 text-white/45 hover:text-red-200" type="button"><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function CharacterRegistryRow({ character, onEdit, onDelete }: { character: CharacterQrRow; onEdit: () => void; onDelete: () => void }) {
  const claimedQuantity = character.claimed_quantity ?? 0;
  const totalQuantity = character.total_quantity ?? 0;
  const remainingQuantity = Math.max(totalQuantity - claimedQuantity, 0);
  const qrStatus = character.qrCode?.status === "disabled" ? "disabled" : remainingQuantity <= 0 ? "sold_out" : character.qrCode?.status ?? "active";

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
      <div className="grid gap-4 sm:grid-cols-[80px_1fr_auto]">
        <div className="relative aspect-square w-full overflow-hidden rounded-md bg-black/50 sm:h-20 sm:w-20">
          {character.image_url ? <Image src={character.image_url} alt={character.name} fill className="object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] text-white/20">T-BIT</div>}
        </div>
        <div className="min-w-0">
          <ClassificationBadge value={character.classification} />
          <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
            <div>
              <dt className="uppercase tracking-[0.2em] text-white/30">Rarity</dt>
              <dd className="mt-1 text-white/75">{character.classification}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.2em] text-white/30">Name</dt>
              <dd className="mt-1 truncate text-white/85">{character.name}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.2em] text-white/30">QR Status</dt>
              <dd className="mt-1 text-white/65">{formatQrStatus(qrStatus)}</dd>
            </div>
          </dl>
          <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-4">
            <div>
              <dt className="uppercase tracking-[0.2em] text-white/30">Total Quantity</dt>
              <dd className="mt-1 text-white/75">{totalQuantity}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.2em] text-white/30">Claimed Quantity</dt>
              <dd className="mt-1 text-white/75">{claimedQuantity}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.2em] text-white/30">Remaining Quantity</dt>
              <dd className="mt-1 text-white/75">{remainingQuantity}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.2em] text-white/30">Price</dt>
              <dd className="mt-1 text-white/75">PHP {Number(character.price ?? 0).toFixed(2)}</dd>
            </div>
          </dl>
          {character.description && <p className="mt-3 line-clamp-2 text-xs leading-5 text-white/45">{character.description}</p>}
        </div>
        <div className="flex gap-2 sm:flex-col">
          <button onClick={onEdit} className="p-2 text-white/45 hover:text-white" type="button"><Save className="h-4 w-4" /></button>
          <button onClick={onDelete} className="p-2 text-white/45 hover:text-red-200" type="button"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="mt-4">
        {character.qrCode ? (
          <QrPreview qr={character.qrCode} characterName={character.name} />
        ) : (
          <div className="rounded-md border border-white/10 bg-black/30 p-3 text-xs uppercase tracking-[0.2em] text-white/35">
            Pending QR generation
          </div>
        )}
      </div>
    </div>
  );
}

function formatQrStatus(status: string) {
  if (status === "sold_out") return "Sold Out";
  if (status === "disabled") return "Disabled";
  return "Active";
}

function QrClaimCard({
  qr,
  onViewClaimants,
}: {
  qr: QrRow;
  onViewClaimants: () => void;
}) {
  const total = qr.techbits_characters?.total_quantity ?? 0;
  const claimed = qr.techbits_characters?.claimed_quantity ?? 0;
  const remaining = Math.max(total - claimed, 0);

  return (
    <article className="rounded-md border border-white/10 bg-white/[0.03] p-4 text-xs text-white/55">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-white/80">{qr.techbits_characters?.name ?? "Unknown"}</p>
          <p className="mt-2 break-all font-mono text-[11px] leading-5 text-white/45">{qr.qr_value}</p>
        </div>
        <span className="shrink-0 rounded-sm border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/50">
          {formatQrStatus(qr.status)}
        </span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <dt className="uppercase tracking-[0.18em] text-white/30">Claimed</dt>
          <dd className="mt-1 text-white/75">{claimed} / {total}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.18em] text-white/30">Remaining</dt>
          <dd className="mt-1 text-white/75">{remaining}</dd>
        </div>
      </dl>
      <button
        type="button"
        onClick={onViewClaimants}
        className="mt-4 h-9 rounded-sm border border-white/10 px-3 text-[10px] uppercase tracking-[0.16em] text-white/70 hover:border-white/20 hover:text-white"
      >
        View Users
      </button>
    </article>
  );
}

function ClaimantsModal({
  qr,
  claimants,
  loading,
  onClose,
}: {
  qr: QrRow | null;
  claimants: QrClaimant[];
  loading: boolean;
  onClose: () => void;
}) {
  if (!qr) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="w-full max-w-2xl rounded-lg border border-white/15 bg-[#080808] p-5 sm:p-6" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">QR Claimants</p>
            <h3 className="mt-2 truncate text-lg font-light text-white/90">{qr.techbits_characters?.name ?? "Unknown Character"}</h3>
            <p className="mt-1 truncate font-mono text-[11px] text-white/45">{qr.qr_value}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-sm border border-white/10 px-3 text-[10px] uppercase tracking-[0.16em] text-white/70 hover:border-white/20 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="mt-5 max-h-[420px] space-y-2 overflow-auto pr-1">
          {loading && <p className="text-sm text-white/45">Loading claimants...</p>}
          {!loading && claimants.length === 0 && <p className="text-sm text-white/45">No users have claimed this QR yet.</p>}
          {!loading && claimants.map((claimant) => (
            <div key={claimant.id} className="flex items-center justify-between gap-3 rounded-sm border border-white/10 bg-black/30 px-3 py-2 text-[11px]">
              <div className="min-w-0">
                <p className="truncate text-white/85">{claimant.profiles?.full_name || "No name"}</p>
                <p className="truncate text-white/45">{claimant.profiles?.email || "No email"}</p>
              </div>
              <p className="shrink-0 text-white/55">{new Date(claimant.claimed_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UserRoleCard({ user, onChangeRole }: { user: Profile; onChangeRole: (id: string, role: UserRole) => void }) {
  return (
    <article className="rounded-md border border-white/10 bg-white/[0.03] p-4 text-xs text-white/55">
      <div className="min-w-0">
        <p className="break-all text-sm text-white/80">{user.email}</p>
        <p className="mt-1 text-white/45">{user.full_name || "No name set"}</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-[10px] uppercase tracking-[0.18em] text-white/30">
          Role
          <select
            value={user.role}
            onChange={(event) => onChangeRole(user.id, event.target.value as UserRole)}
            className="mt-2 w-full rounded-sm border border-white/10 bg-black/40 px-3 py-2 text-xs uppercase tracking-[0.14em] text-white outline-none"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-white/30">Created</p>
          <p className="mt-2 text-white/70">{new Date(user.created_at).toLocaleDateString()}</p>
        </div>
      </div>
    </article>
  );
}

function QrPreview({ qr, characterName }: { qr: QrRow; characterName: string }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&format=png&data=${encodeURIComponent(qr.qr_value)}`;
  const fileName = `${characterName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "techbit"}-${qr.qr_value}.png`;

  return (
    <div className="flex gap-3 rounded-md border border-white/10 bg-black/30 p-3">
      <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-sm bg-white p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`${characterName} QR code`} className="h-full w-full object-contain" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[11px] text-white/65">{qr.qr_value}</p>
        <p className="mt-2 text-[11px] uppercase tracking-[0.18em] text-white/35">{qr.status}</p>
        <a href={src} download={fileName} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-8 items-center gap-2 bg-white/10 px-3 text-[10px] uppercase tracking-[0.16em] text-white/70 hover:bg-white/15 hover:text-white">
          <Download className="h-3.5 w-3.5" /> Download
        </a>
      </div>
    </div>
  );
}
