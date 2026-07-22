import { Redirect } from "wouter";
import { VISITRW3_ROUTES } from "@/lib/visitrw3-routes";

/** Pendaftaran properti sudah tidak tersedia — arahkan ke hub Visit RW3. */
export default function Visitrw3DaftarProperti() {
  return <Redirect to={VISITRW3_ROUTES.hub} />;
}
