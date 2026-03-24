export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[hsl(163,55%,22%)] mb-1">
            Kebijakan Privasi
          </h1>
          <p className="text-sm text-gray-500">
            Aplikasi KPP RW 03 Padasuka — Terakhir diperbarui: Maret 2025
          </p>
        </div>

        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          <section>
            <h2 className="font-semibold text-gray-900 mb-2">1. Pengelola Aplikasi</h2>
            <p>
              Aplikasi ini dikelola oleh RW 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah,
              Kota Cimahi. Ketua RW: Raden Raka. Kontak:{" "}
              <span className="font-medium">rw3padasukacimahi.org</span>
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">2. Data yang Dikumpulkan</h2>
            <p>Kami mengumpulkan data berikut dari warga RW 03 Padasuka:</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Nama lengkap dan NIK (Nomor Induk Kependudukan)</li>
              <li>Nomor Kartu Keluarga</li>
              <li>Nomor WhatsApp</li>
              <li>Alamat tempat tinggal</li>
              <li>Data anggota keluarga (hubungan keluarga, jenis kelamin, tanggal lahir)</li>
              <li>Informasi kesehatan (opsional, untuk keperluan pendataan RW)</li>
              <li>Data ekonomi keluarga (opsional, untuk program bansos)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">3. Tujuan Penggunaan Data</h2>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Pendataan dan administrasi warga RW 03 Padasuka</li>
              <li>Pengiriman informasi dan pengumuman via WhatsApp</li>
              <li>Pengurusan surat keterangan warga</li>
              <li>Penyaluran bantuan sosial (bansos)</li>
              <li>Program dan kegiatan kemasyarakatan RW</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">4. Layanan Pihak Ketiga</h2>
            <p>Aplikasi ini menggunakan layanan pihak ketiga berikut untuk menjalankan fitur tertentu:</p>
            <ul className="mt-2 list-disc list-inside space-y-2">
              <li>
                <span className="font-medium">StarSender (WhatsApp API)</span> — Digunakan untuk
                mengirim pesan dan kode verifikasi (OTP) ke nomor WhatsApp warga. Data yang dikirim:
                nomor WhatsApp dan isi pesan. Kebijakan privasi StarSender berlaku untuk data tersebut.
              </li>
              <li>
                <span className="font-medium">Google Gemini AI</span> — Digunakan untuk fitur
                "Curhat Warga" dan pembuatan surat otomatis. Data yang dikirim ke Google Gemini:
                teks yang ditulis warga beserta nama warga. Data ini diproses oleh AI Google
                untuk menghasilkan respons. Kebijakan privasi Google berlaku untuk data tersebut.
                Kami tidak mengirim NIK, nomor WA, atau data identitas sensitif ke Google Gemini.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">5. Penyimpanan Data</h2>
            <p>
              Data disimpan secara aman di database yang dikelola oleh pengurus RW 03.
              Selain penggunaan layanan pihak ketiga yang disebutkan di atas, data tidak
              dibagikan kepada pihak lain tanpa persetujuan warga, kecuali untuk keperluan
              administrasi pemerintahan yang diwajibkan oleh hukum.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">6. Hak Pengguna</h2>
            <p>Setiap warga berhak untuk:</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Melihat data pribadi yang tersimpan di sistem</li>
              <li>Meminta koreksi data yang tidak akurat</li>
              <li>Meminta penghapusan data jika sudah tidak menjadi warga RW 03</li>
            </ul>
            <p className="mt-2">
              Untuk permintaan terkait data, hubungi pengurus RW 03 secara langsung
              atau melalui fitur laporan di aplikasi.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">7. Keamanan Data</h2>
            <p>
              Kami menggunakan enkripsi dan langkah-langkah keamanan teknis untuk melindungi
              data warga. Akses ke data warga dibatasi hanya untuk pengurus RW yang berwenang.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-gray-900 mb-2">8. Perubahan Kebijakan</h2>
            <p>
              Kebijakan privasi ini dapat diperbarui sewaktu-waktu. Perubahan akan
              diinformasikan melalui aplikasi atau WhatsApp warga.
            </p>
          </section>

          <div className="pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} RW 03 Kelurahan Padasuka, Kecamatan Cimahi Tengah, Kota Cimahi
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
