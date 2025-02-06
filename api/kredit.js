import fs from 'fs';
import multer from 'multer';
import path from 'path';

// Fungsi untuk mengonversi base64 menjadi file
const base64ToFile = (base64Str, filename) => {
  const matches = base64Str.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    const buffer = Buffer.from(matches[2], 'base64');
    fs.writeFileSync(filename, buffer); // Menulis buffer ke file
    console.log(`File berhasil disimpan: ${filename}`);
  } else {
    throw new Error('Format base64 tidak valid');
  }
};

// Set up penyimpanan foto menggunakan multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), 'api', 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true }); // Pastikan folder ada atau buat folder jika tidak ada
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, timestamp + path.extname(file.originalname));  // Menambahkan timestamp ke nama file
  }
});

const upload = multer({ storage });

// Middleware untuk meng-handle upload foto
export const uploadFilesMiddleware = upload.fields([
  { name: 'fotoKunjungan', maxCount: 1 },
  { name: 'fotoDebitur', maxCount: 1 },
  { name: 'fotoSertifikat', maxCount: 1 },
  { name: 'fotoKtp', maxCount: 1 },
  { name: 'fotoKk', maxCount: 1 },
  { name: 'formPengecekanSlik', maxCount: 1 },
  { name: 'formPengajuanKredit', maxCount: 1 },
]);

// Handler untuk menerima dan menyimpan data
export const submitKreditHandler = async (req, res) => {
  // Pertama, jalankan middleware upload untuk menangani file
  uploadFilesMiddleware(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: 'Gagal mengunggah file', error: err.message });
    }

    // Log untuk memeriksa apakah file sudah diterima dengan benar
    console.log('Files received:', req.files);

    const { nama, tujuan, jenisSertifikat, kondisiSertifikat, fotoKunjunganBase64 } = req.body;

    // Jika ada fotoKunjunganBase64, konversi menjadi file di server
    if (fotoKunjunganBase64) {
      try {
        const fotoPath = path.join(process.cwd(), 'api', 'uploads', Date.now() + '.png');
        base64ToFile(fotoKunjunganBase64, fotoPath); // Simpan file yang sudah diubah
        console.log(`Foto Kunjungan disimpan di path: ${fotoPath}`);
      } catch (error) {
        console.error('Error menyimpan foto kunjungan:', error);
        return res.status(400).json({ message: 'Gagal menyimpan foto kunjungan', error: error.message });
      }
    }

    const data = {
      nama,
      tujuan,
      jenisSertifikat,
      kondisiSertifikat,
      files: req.files,  // Menyimpan file yang di-upload dengan multer
    };

    // Simpan data ke file atau database
    const dataFile = './kreditData.json';
    let kreditData = [];
    if (fs.existsSync(dataFile)) {
      kreditData = JSON.parse(fs.readFileSync(dataFile));
    }

    kreditData.push(data);
    fs.writeFileSync(dataFile, JSON.stringify(kreditData, null, 2));

    res.status(200).json({ message: 'Data kredit berhasil disimpan!', data });
  });
};
