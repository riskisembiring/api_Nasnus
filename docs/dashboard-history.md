# History Upload Dashboard

Setiap `POST /api/dashboard/upload` (multipart field `file`) menyimpan history
ke koleksi Firestore `dashboardUploadHistory` beserta subkoleksi `chunks`.
Respons tetap memiliki `data` dashboard dan menambahkan `history` berisi
`id`, `fileName`, `uploadedAt`, dan `totalRows`. Jika penyimpanan gagal,
upload mengembalikan error, bukan respons sukses.

## Tombol History Upload

`GET /api/dashboard/history?page=1&pageSize=10`

```json
{
  "data": [{
    "id": "abcdefghijklmnopqrst",
    "fileName": "Kirim.xlsx",
    "uploadedAt": "2026-09-16T04:39:08.000Z",
    "totalRows": 808
  }],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 1,
    "totalPages": 1,
    "hasPreviousPage": false,
    "hasNextPage": false
  }
}
```

Urutan terbaru dahulu. `pageSize` maksimal 100. `totalRows` menghitung baris data
pada sheet pilihan (`sheet`/`sheetName`, default `data_dashboard` atau sheet pertama),
tanpa header dan baris kosong. Format waktu ISO UTC; tampilkan dengan
`new Date(item.uploadedAt).toLocaleString('id-ID')` di frontend.

## Tombol Lihat

`GET /api/dashboard/history/:id`

Respons `{ "history": { ...metadata }, "data": { ...dashboard } }`.
Gunakan properti `data` untuk membuka dashboard: seluruh `slides`, `tableRows`,
`charts`, `summary`, dan `rawDashboard` (termasuk seluruh `rows`) tersedia tanpa
upload ulang atau `includeRaw=true`. ID tidak valid menghasilkan 400;
history yang tidak ditemukan menghasilkan 404.

## Penyimpanan dan pengujian

Riwayat tersedia lintas browser dan bersifat bersama karena session saat ini
dinonaktifkan. Riwayat lama di browser tidak otomatis dimigrasikan.
Firestore rules harus mengizinkan akses koleksi dan subkoleksi tersebut untuk
konfigurasi backend yang digunakan. Dashboard disimpan sebagai JSON terkompresi
dalam beberapa dokumen; batas payload tersimpan sekitar 7,2 MB base64.
Pagination halaman lanjut membaca metadata sampai halaman yang diminta.

Tes lokal dengan storage tiruan: `node --test test/dashboard-history.test.js`.
Tes ini tidak mengakses Firestore produksi.
