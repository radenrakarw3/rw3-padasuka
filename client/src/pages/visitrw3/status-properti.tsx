import { Redirect } from "wouter";
import { VISITRW3_ROUTES } from "@/lib/visitrw3-routes";

/** Cek status properti (PROP) sudah tidak tersedia — arahkan ke hub Visit RW3. */
export default function Visitrw3StatusProperti() {
  return <Redirect to={VISITRW3_ROUTES.hub} />;
}
