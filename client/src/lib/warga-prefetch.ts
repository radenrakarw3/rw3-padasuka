import type { QueryClient, QueryKey, UseQueryOptions } from "@tanstack/react-query";
import type { AuthUser } from "@/lib/auth";
import { getQueryFn } from "@/lib/queryClient";
import type { KartuKeluarga, Warga } from "@shared/schema";

export type WalletData = {
  saldo: number;
  kodeWallet: string;
  namaWarga: string;
  totalTopup?: number;
  totalBelanja?: number;
  wargaId?: number;
} | null;

export type RwcoinMitra = {
  id: number;
  namaUsaha: string;
  kodeWallet?: string;
};

export type RwcoinVoucher = {
  kode: string;
  isActive: boolean;
  berlakuHingga?: string | null;
  kuota?: number | null;
  terpakai: number;
  mitraId?: number | null;
  nilai: number;
  minTransaksi?: number;
  tipe?: string;
};

type CurhatKuotaData = {
  sudahCurhatHariIni: boolean;
  coinDiberikan: number;
  balasanGemini: string | null;
} | null;

type MitraRwcoinData = RwcoinMitra[];
type VoucherRwcoinData = RwcoinVoucher[];
type IdleHandle = number;
type IdleDeadline = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type IdleCallback = (deadline: IdleDeadline) => void;

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (callback: IdleCallback, options?: { timeout?: number }) => IdleHandle;
  cancelIdleCallback?: (handle: IdleHandle) => void;
};

const walletQueryFn = getQueryFn<WalletData>({ on401: "returnNull" });
const kuotaQueryFn = getQueryFn<CurhatKuotaData>({ on401: "returnNull" });
const mitraQueryFn = getQueryFn<MitraRwcoinData>({ on401: "returnNull" });
const voucherQueryFn = getQueryFn<VoucherRwcoinData>({ on401: "returnNull" });
const kkQueryFn = getQueryFn<KartuKeluarga | null>({ on401: "throw" });
const anggotaQueryFn = getQueryFn<Warga[]>({ on401: "throw" });

export type WargaCoreUser = Pick<AuthUser, "type" | "kkId"> | null | undefined;

export function wargaKkQueryOptions(
  kkId: number | null | undefined,
): UseQueryOptions<KartuKeluarga | null, Error, KartuKeluarga | null, readonly [string, number | undefined]> {
  return {
    queryKey: ["/api/kk", kkId ?? undefined],
    queryFn: kkQueryFn,
    enabled: !!kkId,
  };
}

export function wargaAnggotaQueryOptions(
  kkId: number | null | undefined,
): UseQueryOptions<Warga[], Error, Warga[], readonly [string, number | undefined]> {
  return {
    queryKey: ["/api/warga/kk", kkId ?? undefined],
    queryFn: anggotaQueryFn,
    enabled: !!kkId,
  };
}

export function wargaWalletQueryOptions(): UseQueryOptions<WalletData, Error, WalletData, readonly [string]> {
  return {
    queryKey: ["/api/warga/rwcoin/wallet"],
    queryFn: walletQueryFn,
  };
}

export function wargaCurhatKuotaQueryOptions(): UseQueryOptions<CurhatKuotaData, Error, CurhatKuotaData, readonly [string]> {
  return {
    queryKey: ["/api/warga/curhat/kuota"],
    queryFn: kuotaQueryFn,
    staleTime: 30_000,
  };
}

export function wargaMitraQueryOptions(): UseQueryOptions<MitraRwcoinData, Error, MitraRwcoinData, readonly [string]> {
  return {
    queryKey: ["/api/warga/rwcoin/mitra"],
    queryFn: mitraQueryFn,
    staleTime: 60_000,
  };
}

export function wargaVoucherQueryOptions(): UseQueryOptions<VoucherRwcoinData, Error, VoucherRwcoinData, readonly [string]> {
  return {
    queryKey: ["/api/warga/rwcoin/voucher"],
    queryFn: voucherQueryFn,
  };
}

function isWargaReady(user: WargaCoreUser): user is Pick<AuthUser, "type" | "kkId"> & { type: "warga"; kkId: number } {
  return user?.type === "warga" && !!user.kkId;
}

type PrefetchQueryOpts = {
  queryKey: QueryKey;
  queryFn?: unknown;
  staleTime?: unknown;
};

function prefetchFromOptions(queryClient: QueryClient, opts: PrefetchQueryOpts) {
  if (typeof opts.queryFn !== "function") return Promise.resolve();
  const staleTime = typeof opts.staleTime === "number" ? opts.staleTime : undefined;
  return queryClient.prefetchQuery({
    queryKey: opts.queryKey,
    queryFn: opts.queryFn as (ctx: { queryKey: QueryKey; signal: AbortSignal }) => Promise<unknown>,
    staleTime,
  });
}

export function prefetchWargaCoreData(queryClient: QueryClient, user: WargaCoreUser): () => void {
  if (!isWargaReady(user) || typeof window === "undefined") {
    return () => {};
  }

  const wargaUser = user;
  const win = window as WindowWithIdleCallback;
  let cancelled = false;
  let started = false;
  let idleHandle: IdleHandle | null = null;
  const timeoutHandle = window.setTimeout(() => {
    void startPrefetch();
  }, 180);

  function startPrefetch() {
    if (cancelled || started) return;
    started = true;
    window.clearTimeout(timeoutHandle);
    void runBatches();
  }

  async function runBatches() {
    if (cancelled) return;
    const toPrefetch = (o: {
      queryKey: QueryKey;
      queryFn?: unknown;
      staleTime?: unknown;
    }): PrefetchQueryOpts => o;

    await Promise.allSettled([
      prefetchFromOptions(queryClient, toPrefetch(wargaWalletQueryOptions())),
      prefetchFromOptions(queryClient, toPrefetch(wargaAnggotaQueryOptions(wargaUser.kkId))),
      prefetchFromOptions(queryClient, toPrefetch(wargaKkQueryOptions(wargaUser.kkId))),
      prefetchFromOptions(queryClient, toPrefetch(wargaCurhatKuotaQueryOptions())),
      prefetchFromOptions(queryClient, toPrefetch(wargaMitraQueryOptions())),
      prefetchFromOptions(queryClient, toPrefetch(wargaVoucherQueryOptions())),
    ]);
  }

  if (typeof win.requestIdleCallback === "function") {
    idleHandle = win.requestIdleCallback(() => {
      startPrefetch();
    }, { timeout: 1200 });
  }

  return () => {
    cancelled = true;
    window.clearTimeout(timeoutHandle);
    if (idleHandle != null && typeof win.cancelIdleCallback === "function") {
      win.cancelIdleCallback(idleHandle);
    }
  };
}
