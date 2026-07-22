import { Redirect } from "wouter";
import { VISITRW3_ROUTES } from "@/lib/visitrw3-routes";

/** Login warga singgah sudah tidak dipakai — arahkan ke alur Visit RW3 publik. */
export default function Visitrw3Login() {
  return <Redirect to={VISITRW3_ROUTES.hub} />;
}
