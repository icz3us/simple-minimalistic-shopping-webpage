"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { Boxes, Download, LogOut, QrCodeIcon, RefreshCw, Save, Search, ShoppingBag, Sparkles, Trash2, Users, X } from "lucide-react";
import ClassificationBadge from "@/components/ClassificationBadge";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import TechShell from "@/components/TechShell";
import { fetchWithAuth } from "@/lib/auth/client";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Classification, Product, Profile, ProductUnit, TechBitsCharacter, UserRole } from "@/lib/supabase/types";
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

type ProductUnitRow = ProductUnit & {
  techbits_characters?: {
    name: string;
    classification: Classification;
  } | null;
  profiles?: {
    email: string;
    full_name: string | null;
  } | null;
};

type CharacterQrRow = TechBitsCharacter;

type AdminView = "characters" | "products" | "qr" | "users";

export default function AdminPage() {
  const router = useRouter();
  const [characters, setCharacters] = useState<TechBitsCharacter[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [productUnits, setProductUnits] = useState<ProductUnitRow[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [characterForm, setCharacterForm] = useState<FormState>(blankCharacter);
  const [productForm, setProductForm] = useState<FormState>(blankProduct);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: "character" | "product"; name: string } | null>(null);
  const [actionModal, setActionModal] = useState<{ type: "loading" | "success" | "error"; message: string } | null>(null);
  const [showQrModal, setShowQrModal] = useState<{ token: string; title: string; qrDataUrl: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<AdminView>("characters");
  const [qrSearch, setQrSearch] = useState("");

  const charactersWithQrCodes: CharacterQrRow[] = characters;
  const normalizedQrSearch = qrSearch.trim().toLowerCase();
  const visibleProductUnits = normalizedQrSearch
    ? productUnits.filter((unit) => {
        const characterName = unit.techbits_characters?.name ?? "";
        return [
          characterName,
          unit.techbits_characters?.classification ?? "",
          unit.display_number,
          String(unit.serial_number),
          unit.status,
          unit.qr_token,
        ].some((value) => value.toLowerCase().includes(normalizedQrSearch));
      })
    : productUnits;

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
    if (qrResponse.ok) setProductUnits(qrData.qrCodes);
    if (usersResponse.ok) setUsers(usersData.users);
  }

  async function saveCharacter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionModal({ type: "loading", message: "Saving character..." });
    const image_url = await uploadFormImage(characterForm);
    if (image_url === null) return;

    const path = characterForm.id ? `/api/admin/characters/${characterForm.id}` : "/api/admin/characters";
    const response = await fetchWithAuth(path, {
      method: characterForm.id ? "PUT" : "POST",
      body: JSON.stringify({ ...characterForm, image_url, image_file: undefined, image_preview_url: undefined }),
    });
    const data = await response.json();
    
    if (response.ok) {
      setActionModal({ type: "success", message: "Character saved successfully." });
      setCharacterForm(blankCharacter);
      await refreshAll();
    } else {
      setActionModal({ type: "error", message: data.error ?? "Unable to save character." });
    }
  }

  async function deleteCharacter(id: string) {
    setActionModal({ type: "loading", message: "Deleting character..." });
    const response = await fetchWithAuth(`/api/admin/characters/${id}`, { method: "DELETE" });
    const data = await response.json();
    
    if (response.ok) {
      setActionModal({ type: "success", message: "Character deleted successfully." });
      await refreshAll();
    } else {
      setActionModal({ type: "error", message: data.error ?? "Unable to delete character." });
    }
    setDeleteConfirm(null);
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setActionModal({ type: "loading", message: "Saving product..." });
    const image_url = await uploadFormImage(productForm);
    if (image_url === null) return;

    const productId = productForm.id;
    const path = productId ? `/api/products/${productId}` : "/api/products";
    const response = await fetchWithAuth(path, {
      method: productId ? "PUT" : "POST",
      body: JSON.stringify({ ...productForm, image_url, image_file: undefined, image_preview_url: undefined }),
    });
    const data = await response.json();
    
    if (response.ok) {
      setActionModal({ type: "success", message: "Product saved successfully." });
      setProductForm(blankProduct);
      await refreshAll();
    } else {
      setActionModal({ type: "error", message: data.error ?? "Unable to save product." });
    }
  }

  async function deleteProduct(id: string) {
    setActionModal({ type: "loading", message: "Deleting product..." });
    const response = await fetchWithAuth(`/api/products/${id}`, { method: "DELETE" });
    const data = await response.json();
    
    if (response.ok) {
      setActionModal({ type: "success", message: "Product deleted successfully." });
      await refreshAll();
    } else {
      setActionModal({ type: "error", message: data.error ?? "Unable to delete product." });
    }
    setDeleteConfirm(null);
  }

  async function disableQr(id: string) {
    setActionModal({ type: "loading", message: "Disabling unit..." });
    const response = await fetchWithAuth(`/api/admin/qr-codes/${id}/disable`, { method: "POST" });
    const data = await response.json();
    if (response.ok) {
      setProductUnits((prev) => prev.map((unit) => (unit.id === id ? { ...unit, status: "disabled" } : unit)));
      setActionModal({ type: "success", message: "Product unit disabled successfully." });
    } else {
      setActionModal({ type: "error", message: data.error ?? "Unable to disable unit." });
    }
  }

  async function updateUserRole(id: string, role: UserRole) {
    setActionModal({ type: "loading", message: "Updating user role..." });
    const response = await fetchWithAuth(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    });
    const data = await response.json();

    if (response.ok) {
      setActionModal({ type: "success", message: "User role updated successfully." });
      await refreshAll();
    } else {
      setActionModal({ type: "error", message: data.error ?? "Unable to update user role." });
    }
  }

  async function signOut() {
    await supabaseBrowser.auth.signOut();
    router.replace("/login");
  }

  async function showQr(unit: ProductUnitRow) {
    try {
      const qrDataUrl = await QRCode.toDataURL(unit.qr_token, { width: 300, margin: 1 });
      setShowQrModal({ token: unit.qr_token, title: `${unit.techbits_characters?.name ?? "Unknown"} ${unit.display_number}`, qrDataUrl });
    } catch {
      setActionModal({ type: "error", message: "Failed to generate QR code." });
    }
  }

  async function saveAllQrCodesAsPdf() {
    if (productUnits.length === 0) {
      setActionModal({ type: "error", message: "No QR codes available to save." });
      return;
    }

    setActionModal({ type: "loading", message: "Generating PDF..." });

    try {
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      const grouped = productUnits.reduce((acc, unit) => {
        const rarity = unit.techbits_characters?.classification ?? "Unknown";
        if (!acc[rarity]) acc[rarity] = [];
        acc[rarity].push(unit);
        return acc;
      }, {} as Record<string, ProductUnitRow[]>);

      let isFirstPage = true;
      for (const [rarity, units] of Object.entries(grouped)) {
        if (!isFirstPage) {
          doc.addPage();
        }
        isFirstPage = false;

        doc.setFontSize(16);
        doc.text(`Rarity: ${rarity}`, 10, 15);

        let x = 10;
        let y = 25;
        const qrSize = 40;
        const xStep = 45;
        const yStep = 55;

        for (const unit of units) {
          if (y + yStep > pageHeight) {
            doc.addPage();
            y = 15;
            x = 10;
          }

          const qrDataUrl = await QRCode.toDataURL(unit.qr_token, { width: 300, margin: 1 });
          doc.addImage(qrDataUrl, "PNG", x, y, qrSize, qrSize);
          
          doc.setFontSize(8);
          const title = unit.techbits_characters?.name ?? "Unknown";
          doc.text(`${title} ${unit.display_number}`, x + (qrSize / 2), y + qrSize + 4, { align: "center" });

          x += xStep;
          if (x + xStep > pageWidth - qrSize) {
            x = 10;
            y += yStep;
          }
        }
      }

      doc.save("TechBits_QRCodes.pdf");
      setActionModal({ type: "success", message: "PDF generated successfully." });
    } catch {
      setActionModal({ type: "error", message: "Failed to generate PDF." });
    }
  }

  async function uploadFormImage(form: FormState) {
    if (!form.image_file) return form.image_url;

    setActionModal({ type: "loading", message: "Uploading image..." });
    const formData = new FormData();
    formData.append("file", form.image_file);

    try {
      const response = await fetchWithAuth("/api/admin/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        setActionModal({ type: "error", message: data.error || "Upload failed" });
        return null;
      }
      return data.url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setActionModal({ type: "error", message });
      return null;
    }
  }

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <TechShell title="Admin Dashboard" subtitle="Loading admin controls..." />;

  return (
    <TechShell title="Admin Dashboard" subtitle="Manage TechBits products, character collectibles, QR batches, and claims.">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
            <div className="grid gap-4">
              {charactersWithQrCodes.map((character) => (
                <CharacterRegistryRow
                  key={character.id}
                  character={character}
                  onEdit={() => setCharacterForm({ ...character, image_url: character.image_url ?? "", price: String(character.price ?? 0), quantity: String(character.total_quantity ?? 1) })}
                  onDelete={() => setDeleteConfirm({ id: character.id, type: "character", name: character.name })}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {activeView === "products" && (
        <section className="grid min-w-0 gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:gap-6">
          <AdminForm title={productForm.id ? "Edit Product" : "Create Product"} onSubmit={saveProduct}>
            <Fields form={productForm} setForm={setProductForm} includeClassification={false} includeCommerce includeCharacterInventory={false} />
          </AdminForm>

          <div className="glass-panel min-w-0 overflow-hidden rounded-lg bg-[#0a0a0a]/80 p-4 sm:p-6">
            <h2 className="mb-5 text-xs uppercase tracking-[0.26em] text-white/70 sm:text-sm sm:tracking-[0.3em]">Product Listing</h2>
            <div className="grid gap-4">
              {products.map((product) => (
                <RegistryRow
                  key={product.id}
                  title={product.name}
                  subtitle={product.details || product.description}
                  imageUrl={product.image_url}
                  classification={product.classification}
                  onEdit={() => setProductForm({ ...product, image_url: product.image_url ?? "", price: String(product.price ?? 0), stock: String(product.stock ?? 0), details: product.details ?? "" })}
                  onDelete={() => setDeleteConfirm({ id: product.id, type: "product", name: product.name })}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {activeView === "qr" && (
        <section className="glass-panel min-w-0 rounded-lg bg-[#0a0a0a]/80 p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xs uppercase tracking-[0.26em] text-white/70 sm:text-sm sm:tracking-[0.3em]">Per-Unit QR Codes</h2>
            <button onClick={saveAllQrCodesAsPdf} className="flex h-9 items-center gap-2 rounded-sm bg-white px-4 text-[10px] uppercase tracking-widest text-black hover:bg-white/85">
              <Download className="h-3 w-3" /> Save All QR Code
            </button>
          </div>
          <label className="mb-4 flex min-h-11 items-center gap-3 rounded-sm border border-white/10 bg-black/40 px-3 text-xs text-white/55">
            <Search className="h-4 w-4 shrink-0 text-white/35" />
            <input
              value={qrSearch}
              onChange={(event) => setQrSearch(event.target.value)}
              placeholder="Search #1/10, character, status, or token"
              className="h-11 min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
            />
          </label>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProductUnits.map((unit) => (
              <QrClaimCard
                key={unit.id}
                unit={unit}
                onDisable={() => disableQr(unit.id)}
                onShow={() => showQr(unit)}
              />
            ))}
            {productUnits.length === 0 && <p className="text-sm text-white/45">No product units found.</p>}
            {productUnits.length > 0 && visibleProductUnits.length === 0 && <p className="text-sm text-white/45">No numbered units match that search.</p>}
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

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div className="w-full max-w-sm rounded-lg border border-red-500/20 bg-[#080808] p-5 text-center shadow-[0_0_60px_rgba(239,68,68,0.1)]" onClick={(e) => e.stopPropagation()}>
            <Trash2 className="mx-auto mb-4 h-10 w-10 text-red-400" />
            <h3 className="text-lg font-light text-white/90">Delete {deleteConfirm.type === "character" ? "Character" : "Product"}</h3>
            <p className="mt-2 text-sm text-white/50">Are you sure you want to delete <span className="text-white/80">{deleteConfirm.name}</span>? This action cannot be undone.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-sm border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-white/70 hover:bg-white/10 hover:text-white">Cancel</button>
              <button onClick={() => deleteConfirm.type === "character" ? deleteCharacter(deleteConfirm.id) : deleteProduct(deleteConfirm.id)} className="flex-1 rounded-sm bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-red-400 hover:bg-red-500/20 hover:text-red-300">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => setShowQrModal(null)}>
          <div className="relative w-full max-w-sm rounded-lg border border-white/10 bg-[#080808] p-6 text-center shadow-xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowQrModal(null)} className="absolute right-4 top-4 text-white/50 hover:text-white">
              <X className="h-5 w-5" />
            </button>
            <h3 className="mb-4 text-lg font-light text-white/90">{showQrModal.title}</h3>
            <div className="mx-auto aspect-square w-48 overflow-hidden rounded-md bg-white p-2">
              <Image src={showQrModal.qrDataUrl} alt="QR Code" width={300} height={300} className="h-full w-full object-contain" />
            </div>
            <p className="mt-4 break-all font-mono text-xs text-white/50">{showQrModal.token}</p>
          </div>
        </div>
      )}

      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-lg border border-white/10 bg-[#080808] p-6 text-center shadow-xl">
            {actionModal.type === "loading" && <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-white/40" />}
            {actionModal.type === "success" && <Sparkles className="mx-auto mb-4 h-8 w-8 text-emerald-400" />}
            {actionModal.type === "error" && <Trash2 className="mx-auto mb-4 h-8 w-8 text-red-400" />}
            <h3 className="text-lg font-light text-white/90">
              {actionModal.type === "loading" ? "Processing" : actionModal.type === "success" ? "Success" : "Error"}
            </h3>
            <p className="mt-2 text-sm text-white/50">{actionModal.message}</p>
            {actionModal.type !== "loading" && (
              <button onClick={() => setActionModal(null)} className="mt-6 w-full rounded-sm border border-white/10 bg-white/[0.03] px-4 py-2.5 text-xs uppercase tracking-[0.18em] text-white/70 hover:bg-white/10 hover:text-white">
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}

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
      </div>
      {children}
      <div className="mt-6 border-t border-white/10 pt-5 text-right">
        <button type="submit" className="flex h-11 w-full sm:inline-flex items-center justify-center gap-2 bg-white px-8 text-xs uppercase tracking-[0.18em] text-black hover:bg-white/85">
          <Save className="h-4 w-4" /> Save
        </button>
      </div>
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

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
      <div className="grid gap-4 sm:grid-cols-[80px_1fr_auto]">
        <div className="relative aspect-square w-full overflow-hidden rounded-md bg-black/50 sm:h-20 sm:w-20">
          {character.image_url ? <Image src={character.image_url} alt={character.name} fill className="object-cover" /> : <div className="flex h-full items-center justify-center text-[10px] text-white/20">T-BIT</div>}
        </div>
        <div className="min-w-0">
          <ClassificationBadge value={character.classification} />
          <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.15em] text-white/30">Rarity</dt>
              <dd className="mt-1 text-white/75">{character.classification}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[10px] uppercase tracking-[0.15em] text-white/30">Name</dt>
              <dd className="mt-1 truncate text-white/85">{character.name}</dd>
            </div>
          </dl>
          <dl className="mt-4 grid gap-3 text-xs grid-cols-2 xl:grid-cols-4">
            <div>
              <dt className="text-[10px] uppercase tracking-[0.15em] text-white/30">Total Qty</dt>
              <dd className="mt-1 text-white/75">{totalQuantity}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.15em] text-white/30">Claimed</dt>
              <dd className="mt-1 text-white/75">{claimedQuantity}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.15em] text-white/30">Remaining</dt>
              <dd className="mt-1 text-white/75">{remainingQuantity}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-[0.15em] text-white/30">Price</dt>
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
    </div>
  );
}

function formatQrStatus(status: string) {
  if (status === "sold_out") return "Sold Out";
  if (status === "claimed") return "Claimed";
  if (status === "unclaimed") return "Unclaimed";
  if (status === "disabled") return "Disabled";
  return "Active";
}

function QrClaimCard({
  unit,
  onDisable,
  onShow,
}: {
  unit: ProductUnitRow;
  onDisable: (id: string) => void;
  onShow: () => void;
}) {
  return (
    <article className="rounded-md border border-white/10 bg-white/[0.03] p-4 text-xs text-white/55">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-white/80">{unit.techbits_characters?.name ?? "Unknown"}</p>
            <span className="rounded-sm border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-white/60">
              {unit.display_number}
            </span>
          </div>
          <p className="mt-2 break-all font-mono text-[11px] leading-5 text-white/45">{unit.qr_token}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="shrink-0 rounded-sm border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-white/50">
            {formatQrStatus(unit.status)}
          </span>
          <div className="flex flex-col items-end gap-1 mt-1">
            <button
              onClick={onShow}
              className="text-[10px] uppercase tracking-[0.18em] text-white/70 hover:text-white"
            >
              Show
            </button>
            {unit.status !== "disabled" && (
              <button
                onClick={() => onDisable(unit.id)}
                className="text-[10px] uppercase tracking-[0.18em] text-red-300/70 hover:text-red-300"
              >
                Disable
              </button>
            )}
          </div>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <dt className="uppercase tracking-[0.18em] text-white/30">Number</dt>
          <dd className="mt-1 font-mono text-white/75">{unit.display_number}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.18em] text-white/30">Rarity</dt>
          <dd className="mt-1 text-white/75">{unit.techbits_characters?.classification ?? "Unknown"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.18em] text-white/30">Claimed By</dt>
          <dd className="mt-1 text-white/75">{unit.profiles?.full_name || unit.profiles?.email || "Unclaimed"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.18em] text-white/30">Claim Date</dt>
          <dd className="mt-1 text-white/75">{unit.claimed_at ? new Date(unit.claimed_at).toLocaleDateString() : "N/A"}</dd>
        </div>
      </dl>
    </article>
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
