import { Redirect } from "wouter";

/** Halaman properti dihapus — alihkan ke antrian survey warga. */
export default function AdminVisitrw3Properti() {
  return <Redirect to="/admin/visitrw3/antrian" />;
}
