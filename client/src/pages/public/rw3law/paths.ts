import { RW3LAW_PUBLIC_PATH } from "@/lib/rw3law-share";

/** Path daftar peraturan (kanonik /rwlaw). */
export const RW3LAW_LIST_PATH = RW3LAW_PUBLIC_PATH;

export function rw3lawDetailPath(slug: string): string {
  return `${RW3LAW_PUBLIC_PATH}/${encodeURIComponent(slug)}`;
}
