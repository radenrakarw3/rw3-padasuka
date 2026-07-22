import { Redirect } from "wouter";
import { RW3BIZ_ROUTES } from "@/lib/rw3biz-routes";

/** Usaha rumahan / jualan digabung ke RW3BIZ. */
export default function Visitrw3HubUsahaRumahan() {
  return <Redirect to={RW3BIZ_ROUTES.hub} />;
}
