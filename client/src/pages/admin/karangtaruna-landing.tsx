import { Redirect } from "wouter";
import { KARANGTARUNA_ROUTES } from "@/lib/karangtaruna-routes";

export default function AdminKarangtarunaLanding() {
  return <Redirect to={KARANGTARUNA_ROUTES.admin.anggota} />;
}
