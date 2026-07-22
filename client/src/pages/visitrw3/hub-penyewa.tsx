import { Redirect } from "wouter";
import { VISITRW3_ROUTES } from "@/lib/visitrw3-routes";

/** Alur penyewa terpisah sudah dihapus — arahkan ke hub Visit RW3. */
export default function Visitrw3HubPenyewa() {
  return <Redirect to={VISITRW3_ROUTES.hub} />;
}
