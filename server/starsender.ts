/**
 * Pengiriman WhatsApp via Star Sender V3 API.
 * @see https://docs.starsender.online/docs/message-api/kirim-pesan
 */

export type WaSendFailureKind =
  | "invalid_number"
  | "disconnected"
  | "rate_limited"
  | "temporary"
  | "provider_error";

export type WaSendResult = { ok: true } | { ok: false; kind: WaSendFailureKind; message: string };

const STARSENDER_SEND_URL =
  process.env.STARSENDER_API_URL ?? "https://api.starsender.online/api/send";

function getStarsenderApiKey(): string {
  return (
    process.env.STARSENDER_API_KEY?.trim() ||
    process.env.STARSENDER_DEVICE_API_KEY?.trim() ||
    ""
  );
}

function classifyStarsenderError(message: string, httpStatus?: number): WaSendFailureKind {
  const lower = message.toLowerCase();
  if (httpStatus === 429 || lower.includes("limit") || lower.includes("rate")) return "rate_limited";
  if (
    lower.includes("logout") ||
    lower.includes("disconnect") ||
    lower.includes("device") ||
    lower.includes("auth") ||
    lower.includes("token") ||
    lower.includes("unauthorized") ||
    lower.includes("api key")
  ) {
    return "disconnected";
  }
  if (lower.includes("invalid") || lower.includes("nomor") || lower.includes("number")) {
    return "invalid_number";
  }
  if (lower.includes("timeout") || lower.includes("network") || lower.includes("fetch")) {
    return "temporary";
  }
  return "provider_error";
}

/** Format nomor untuk Star Sender (menerima 08… atau 62…). */
export function formatPhoneForStarsender(phoneNumber: string): string | null {
  let digits = phoneNumber.replace(/[^0-9]/g, "");
  if (digits.startsWith("62")) {
    digits = "0" + digits.slice(2);
  } else if (digits.startsWith("8")) {
    digits = "0" + digits;
  } else if (!digits.startsWith("0")) {
    digits = "0" + digits;
  }
  if (digits.length < 10) return null;
  return digits;
}

export function isStarsenderConfigured(): boolean {
  return Boolean(getStarsenderApiKey());
}

export async function sendWhatsApp(
  phoneNumber: string,
  message: string,
  delay = 5,
): Promise<WaSendResult> {
  const apiKey = getStarsenderApiKey();
  if (!apiKey) {
    return {
      ok: false,
      kind: "disconnected",
      message: "STARSENDER_API_KEY belum dikonfigurasi",
    };
  }

  const to = formatPhoneForStarsender(phoneNumber);
  if (!to) {
    console.error("Star Sender: nomor tidak valid (terlalu pendek):", phoneNumber);
    return { ok: false, kind: "invalid_number", message: "Nomor WhatsApp terlalu pendek" };
  }

  const payload: Record<string, unknown> = {
    messageType: "text",
    to,
    body: message,
  };
  if (delay > 0) payload.delay = delay;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(STARSENDER_SEND_URL, {
      method: "POST",
      headers: {
        Authorization: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const rawText = await response.text();
    let result: { success?: boolean; message?: string; data?: unknown } = {};
    if (rawText) {
      try {
        result = JSON.parse(rawText) as typeof result;
      } catch {
        result = { success: false, message: rawText };
      }
    }

    if (!response.ok || result.success === false) {
      const errorMessage =
        result.message ||
        (typeof result.data === "string" ? result.data : "") ||
        `HTTP ${response.status}`;
      console.error("Star Sender error:", errorMessage);
      return {
        ok: false,
        kind: classifyStarsenderError(errorMessage, response.status),
        message: errorMessage,
      };
    }

    return { ok: true };
  } catch (error) {
    console.error("WhatsApp send error:", error);
    const messageText = error instanceof Error ? error.message : "Gagal mengirim WhatsApp";
    return { ok: false, kind: classifyStarsenderError(messageText), message: messageText };
  }
}
