"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, ScanLine } from "lucide-react";
import ClassificationBadge from "@/components/ClassificationBadge";
import TechShell from "@/components/TechShell";
import { fetchWithAuth } from "@/lib/auth/client";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { CollectionItem, TechBitsCharacter } from "@/lib/supabase/types";

type ClaimResult = {
  id: string;
  user_id: string;
  character_id: string;
  product_unit_id: string;
  claimed_at: string;
  character: Pick<TechBitsCharacter, "id" | "name" | "description" | "image_url" | "classification">;
  product_units: {
    serial_number: number;
    total_quantity: number;
    display_number: string;
  };
};

type ClaimModalState =
  | { type: "success"; claim: ClaimResult }
  | { type: "error"; message: string };

const scannerElementId = "techbits-qr-scanner";

export default function DashboardPage() {
  const router = useRouter();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isClaimingRef = useRef(false);
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [manualCode, setManualCode] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [validating, setValidating] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<PermissionState | "unsupported" | "unknown">("unknown");
  const [modal, setModal] = useState<ClaimModalState | null>(null);

  async function loadInitialData() {
    const { data } = await supabaseBrowser.auth.getSession();
    if (!data.session) {
      router.replace("/login");
      return;
    }

    const profileResponse = await fetchWithAuth("/api/me");
    const profileData = await profileResponse.json();
    if (!profileResponse.ok) {
      router.replace("/login");
      return;
    }
    if (profileData.profile.role === "admin") {
      router.replace("/admin");
      return;
    }

    await loadCollection();
    setLoading(false);
    await checkCameraPermission();
  }

  async function loadCollection() {
    const response = await fetchWithAuth("/api/collection");
    const data = await response.json();
    if (response.ok) setCollection(data.collection);
  }

  async function claimQr(qrValue: string) {
    if (isClaimingRef.current) return;
    isClaimingRef.current = true;
    setValidating(true);
    setStatus("Validating QR code...");
    const response = await fetchWithAuth("/api/claim", {
      method: "POST",
      body: JSON.stringify({ qr_value: qrValue }),
    });
    const data = await response.json();

    if (!response.ok) {
      const message = response.status === 401
        ? "Please log in first to claim this collectible."
        : data.error ?? "Unable to claim this QR code.";
      setStatus(message);
      setModal({ type: "error", message });
      setValidating(false);
      window.setTimeout(() => {
        isClaimingRef.current = false;
      }, 1500);
      return;
    }

    await stopCamera();
    const displayNumber = data.claim?.product_units?.display_number ?? "";
    setStatus(`Claimed ${data.claim?.character?.name ?? "TechBit"} ${displayNumber} successfully.`);
    setModal({ type: "success", claim: data.claim });
    setManualCode("");
    await loadCollection();
    setValidating(false);
    window.setTimeout(() => {
      isClaimingRef.current = false;
    }, 1500);
  }

  async function onManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (manualCode.trim()) await claimQr(manualCode.trim());
  }

  async function checkCameraPermission() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Camera access is not supported in this browser. Enter the QR value manually.");
      setCameraPermission("unsupported");
      return;
    }

    try {
      const permission = await navigator.permissions?.query({ name: "camera" as PermissionName });
      if (!permission) {
        setStatus("Press Start Camera to allow camera access.");
        return;
      }

      setCameraPermission(permission.state);
      setCameraReady(permission.state === "granted");
      setStatus(permission.state === "granted" ? "Camera ready. Press Start Camera to scan." : "Press Start Camera to allow camera access.");
      permission.onchange = () => {
        setCameraPermission(permission.state);
        setCameraReady(permission.state === "granted");
      };
    } catch {
      setStatus("Press Start Camera to allow camera access.");
    }
  }

  async function startCamera() {
    if (scanning || validating) return;

    try {
      const scanner = scannerRef.current ?? new Html5Qrcode(scannerElementId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          aspectRatio: 1,
        },
        async (decodedText) => {
          if (isClaimingRef.current) return;
          await claimQr(decodedText);
        },
        undefined
      );

      setScanning(true);
      setCameraReady(true);
      setCameraPermission("granted");
      setStatus("Place the QR Code inside the frame.");
    } catch (error) {
      setScanning(false);
      const message = error instanceof Error ? error.message : "";
      const blocked = message.toLowerCase().includes("permission") || message.toLowerCase().includes("denied") || message.toLowerCase().includes("notallowed");
      if (blocked) {
        setCameraPermission("denied");
        setStatus("Camera permission was blocked. Allow camera access in the browser, then press Start Camera again.");
      } else {
        setStatus(message || "Unable to start camera. Check browser permissions.");
      }
    }
  }

  async function stopCamera() {
    const scanner = scannerRef.current;
    if (!scanner) {
      setScanning(false);
      return;
    }

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      await scanner.clear();
    } catch {
      // Scanner cleanup can throw if the camera is already stopped.
    }

    scannerRef.current = null;
    setScanning(false);
  }

  useEffect(() => {
    // Initial auth/data hydration has to run after Supabase restores the browser session.
    loadInitialData();
    return () => {
      void stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const collectionValue = collection.reduce(
    (total, item) => total + Number(item.techbits_characters?.price ?? 0),
    0
  );

  if (loading) {
    return <TechShell title="User Dashboard" subtitle="Loading collector access..." />;
  }

  return (
    <TechShell title="User Dashboard" subtitle="Scan the QR code on the back of a physical TechBits pin to claim it once.">
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:gap-6">
        <section className="glass-panel rounded-lg bg-[#0a0a0a]/80 p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xs uppercase tracking-[0.26em] text-white/70 sm:text-sm sm:tracking-[0.3em]">Claim Pin</h2>
          </div>

          <div className="relative aspect-square max-h-[420px] min-h-[220px] w-full overflow-hidden rounded-md border border-white/10 bg-black/60 sm:min-h-[320px]">
            <div
              id={scannerElementId}
              className="h-full w-full overflow-hidden [&_canvas]:!h-full [&_canvas]:!w-full [&_canvas]:!object-cover [&_video]:!h-full [&_video]:!w-full [&_video]:!object-cover"
            />
            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/45">
                <Camera className="h-10 w-10" />
                <span className="px-6 text-center text-xs uppercase tracking-[0.22em]">
                  {cameraPermission === "denied" ? "Camera blocked" : cameraReady ? "Camera ready" : "Tap start to allow camera"}
                </span>
              </div>
            )}
            {scanning && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className={`aspect-square w-[min(70%,230px)] border ${validating ? "border-white/70" : "border-white/35"} shadow-[0_0_40px_rgba(255,255,255,0.12)]`} />
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-xs uppercase tracking-[0.18em] text-white/40">
            Place the QR Code inside the frame.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button onClick={startCamera} disabled={scanning || validating} className="flex h-11 flex-1 items-center justify-center gap-2 bg-white/10 text-[11px] uppercase tracking-[0.12em] hover:bg-white/15 disabled:opacity-50 sm:text-xs sm:tracking-[0.18em]">
              <ScanLine className="h-4 w-4" /> Start Camera
            </button>
            <button onClick={() => void stopCamera()} className="h-11 px-5 text-[11px] uppercase tracking-[0.12em] text-white/50 hover:text-white sm:text-xs sm:tracking-[0.18em]">
              Stop
            </button>
          </div>

          <form onSubmit={onManualSubmit} className="mt-5 space-y-3">
            <input
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              placeholder="Paste QR value"
              className="w-full rounded-sm border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-white/25 focus:border-white/40"
            />
            <button disabled={validating} className="h-11 w-full bg-white/10 text-[11px] uppercase tracking-[0.12em] hover:bg-white/15 disabled:opacity-50 sm:text-xs sm:tracking-[0.18em]">
              {validating ? "Validating..." : "Validate QR"}
            </button>
          </form>
          {status && <p className="mt-4 text-sm text-white/65">{status}</p>}
        </section>

        <section className="glass-panel rounded-lg bg-[#0a0a0a]/80 p-4 sm:p-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-[0.26em] text-white/30">Vault</p>
              <h2 className="text-xs uppercase tracking-[0.26em] text-white/70 sm:text-sm sm:tracking-[0.3em]">My Collection</h2>
            </div>
            <div className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-3 sm:text-right">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">{collection.length} claimed</p>
              <p className="mt-1 text-lg font-light text-white/85">PHP {collectionValue.toFixed(2)}</p>
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/30">Total Value</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {collection.map((item) => (
              <article key={item.id} className="rounded-md border border-white/10 bg-white/[0.03] p-4">
                <div className="relative mb-4 aspect-square overflow-hidden rounded-md bg-black/50">
                  {item.techbits_characters?.image_url ? (
                    <Image src={item.techbits_characters.image_url} alt={item.techbits_characters.name} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.3em] text-white/20">T-BIT</div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {item.techbits_characters && <ClassificationBadge value={item.techbits_characters.classification} />}
                  {item.product_units?.display_number && (
                    <span className="rounded-sm border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-white/55">
                      {item.product_units.display_number}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 text-lg font-light text-white/90">{item.techbits_characters?.name}</h3>
                <p className="mt-2 line-clamp-3 text-sm font-light leading-6 text-white/50">{item.techbits_characters?.description}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Claimed</p>
                    <p className="mt-1 text-xs text-white/55">{new Date(item.claimed_at).toLocaleDateString()}</p>
                    {item.product_units?.display_number && <p className="mt-1 font-mono text-[10px] text-white/40">{item.product_units.display_number}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Value</p>
                    <p className="mt-1 text-sm text-white/80">
                      PHP {Number(item.techbits_characters?.price ?? 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
            {collection.length === 0 && <p className="text-sm text-white/45">No pins claimed yet.</p>}
          </div>
        </section>
      </div>

      <ClaimModal
        modal={modal}
        onClose={() => setModal(null)}
        onViewCollection={() => setModal(null)}
        onScanAnother={async () => {
          setModal(null);
          await startCamera();
        }}
      />
    </TechShell>
  );
}

function ClaimModal({
  modal,
  onClose,
  onViewCollection,
  onScanAnother,
}: {
  modal: ClaimModalState | null;
  onClose: () => void;
  onViewCollection: () => void;
  onScanAnother: () => void;
}) {
  const isSuccess = modal?.type === "success";
  const classification = isSuccess ? modal.claim.character.classification : "Common";
  const isHighRarity = classification === "Rare" || classification === "Legendary";
  const aura = classification === "Legendary"
    ? "shadow-[0_0_90px_rgba(250,204,21,0.35)] border-yellow-200/40"
    : classification === "Rare"
      ? "shadow-[0_0_70px_rgba(96,165,250,0.32)] border-sky-200/35"
      : "shadow-[0_0_50px_rgba(255,255,255,0.12)] border-white/15";

  return (
    <AnimatePresence>
      {modal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
        >
          {isSuccess && <Confetti intense={isHighRarity} />}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 22, stiffness: 220 }}
            className={`relative w-full max-w-md overflow-hidden rounded-lg border bg-[#080808] p-5 text-center ${isSuccess ? aura : "border-red-200/25 shadow-[0_0_60px_rgba(248,113,113,0.12)]"}`}
          >
            {isSuccess ? (
              <>
                {isHighRarity && <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.16),transparent)] animate-pulse" />}
                <div className="relative z-10">
                  <div className="relative mx-auto mb-5 aspect-square w-40 overflow-hidden rounded-md border border-white/10 bg-black/60">
                    {modal.claim.character.image_url ? (
                      <Image src={modal.claim.character.image_url} alt={modal.claim.character.name} fill className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.3em] text-white/20">T-BIT</div>
                    )}
                  </div>
                  <ClassificationBadge value={modal.claim.character.classification} />
                  <h3 className="mt-4 text-2xl font-light text-white">Congratulations!</h3>
                  <p className="mt-2 text-sm leading-6 text-white/60">
                    You claimed {modal.claim.character.name} {modal.claim.product_units.display_number}
                  </p>
                  <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-white/35">
                    Claimed {new Date(modal.claim.claimed_at).toLocaleString()}
                  </p>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <button type="button" onClick={onViewCollection} className="h-11 bg-white/10 text-xs uppercase tracking-[0.18em] text-white/75 hover:bg-white/15">
                      View My Collection
                    </button>
                    <button type="button" onClick={onScanAnother} className="h-11 bg-white text-xs uppercase tracking-[0.18em] text-black hover:bg-white/85">
                      Scan Another QR
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-light text-red-100">Claim Failed</h3>
                <p className="mt-3 text-sm leading-6 text-white/60">{modal.message}</p>
                <button type="button" onClick={onClose} className="mt-6 h-11 w-full bg-white/10 text-xs uppercase tracking-[0.18em] text-white/75 hover:bg-white/15">
                  Close
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Confetti({ intense }: { intense: boolean }) {
  const pieces = Array.from({ length: intense ? 42 : 24 }, (_, index) => index);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((piece) => (
        <motion.span
          key={piece}
          initial={{
            opacity: 1,
            y: -20,
            x: `${(piece * 37) % 100}vw`,
            rotate: 0,
          }}
          animate={{
            opacity: 0,
            y: "105vh",
            rotate: 360 + piece * 8,
          }}
          transition={{
            duration: intense ? 2.6 : 2.1,
            delay: (piece % 10) * 0.05,
            ease: "easeOut",
          }}
          className={`absolute top-0 h-2 w-1 ${piece % 3 === 0 ? "bg-yellow-200" : piece % 3 === 1 ? "bg-sky-200" : "bg-white"}`}
        />
      ))}
    </div>
  );
}
