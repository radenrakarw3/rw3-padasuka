import { Redirect } from "wouter";

/** Login warga singgah sudah tidak dipakai — arahkan ke alur Visit RW3 publik. */
export default function Visitrw3Login() {
  return <Redirect to="/visitrw3/penyewa" />;
}
