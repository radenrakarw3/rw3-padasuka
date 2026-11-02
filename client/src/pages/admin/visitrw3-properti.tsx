import { Redirect } from "wouter";

/** Halaman properti dihapus — alihkan ke antrian verifikasi Visit. */
export default function AdminVisitrw3Properti() {
  return <Redirect to="/admin/visitrw3/antrian?view=belum" />;
}
