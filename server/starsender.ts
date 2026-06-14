const STARSENDER_SEND_URL = "https://api.starsender.online/api/send";

export type StarSenderMessageType = "text" | "media";

export interface SendStarSenderOptions {
  to: string;
  body: string;
  messageType?: StarSenderMessageType;
  file?: string;
  delay?: number;
}

export interface StarSenderSendResult {
  ok: boolean;
  success?: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}

function isStarSenderDisabled(): boolean {
  const flag = process.env.STARSENDER_DISABLED?.trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return true;
  const enabled = process.env.STARSENDER_ENABLED?.trim().toLowerCase();
  if (enabled === "0" || enabled === "false" || enabled === "no") return true;
  return false;
}

function getStarSenderConfig() {
  const apiKey = process.env.STARSENDER_API_KEY?.trim();
  const deviceIdRaw = process.env.STARSENDER_DEVICE_ID?.trim();
  const deviceId = deviceIdRaw ? parseInt(deviceIdRaw, 10) : undefined;

  return {
    apiKey,
    deviceId: Number.isFinite(deviceId) ? deviceId : undefined,
    configured: Boolean(apiKey) && !isStarSenderDisabled(),
  };
}

export function isStarSenderDisabledFlag(): boolean {
  return isStarSenderDisabled();
}

export function isStarSenderConfigured(): boolean {
  return getStarSenderConfig().configured;
}

export function getStarSenderDeviceId(): number | undefined {
  return getStarSenderConfig().deviceId;
}

/** Normalisasi nomor WA ke format yang diterima StarSender (0xxx atau 62xxx). */
export function normalizeStarSenderPhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return digits;
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  if (digits.startsWith("8")) return `0${digits}`;
  return digits;
}

export async function sendStarSenderMessage(
  options: SendStarSenderOptions,
): Promise<StarSenderSendResult> {
  const { apiKey, deviceId } = getStarSenderConfig();

  if (!apiKey) {
    return { ok: false, error: "STARSENDER_API_KEY belum dikonfigurasi" };
  }

  if (isStarSenderDisabled()) {
    return { ok: false, error: "StarSender dinonaktifkan (STARSENDER_DISABLED)" };
  }

  const payload: Record<string, unknown> = {
    messageType: options.messageType ?? "text",
    to: normalizeStarSenderPhone(options.to),
    body: options.body,
  };

  if (deviceId != null) payload.device_id = deviceId;
  if (options.file) payload.file = options.file;
  if (options.delay != null) payload.delay = options.delay;

  try {
    const response = await fetch(STARSENDER_SEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: apiKey,
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let parsed: { success?: boolean; message?: string; data?: unknown } = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { message: text };
    }

    if (!response.ok || parsed.success === false) {
      return {
        ok: false,
        success: parsed.success,
        message: parsed.message,
        data: parsed.data,
        error: parsed.message || `StarSender HTTP ${response.status}`,
      };
    }

    return {
      ok: true,
      success: parsed.success ?? true,
      message: parsed.message,
      data: parsed.data,
    };
  } catch (error: any) {
    return { ok: false, error: error?.message || "Gagal menghubungi StarSender" };
  }
}
