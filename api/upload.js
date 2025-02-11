import axios from 'axios';
import FormData from 'form-data';

export const uploadImagekitHandler = async (req, res) => {
  const { file } = req;

  if (!file) {
    return res.status(400).json({ message: 'File tidak ditemukan' });
  }

  try {
    // Memastikan file buffer ada
    if (!file.buffer) {
      return res.status(400).json({ message: 'File buffer tidak ditemukan' });
    }

    const privateKey = 'private_5AhqwfLNexuB+St9QoDexd+y5hs='; // Ganti dengan Private API Key ImageKit Anda
    const formData = new FormData();

    // Menambahkan file ke FormData
    formData.append('file', file.buffer, file.originalname); // Buffer dari file dan nama file
    formData.append('fileName', file.originalname || 'default.jpg'); // Nama file
    formData.append('folder', 'bprNasnus');

    // Mengirimkan permintaan ke API ImageKit
    const response = await axios.post('https://upload.imagekit.io/api/v1/files/upload', formData, {
      headers: {
        Authorization: `Basic ${Buffer.from(privateKey + ':').toString('base64')}`, // Basic Auth
        ...formData.getHeaders(), // Header otomatis dari FormData
      },
    });

    // Mengirimkan respons berhasil
    return res.status(200).json({
      message: 'Upload berhasil',
      data: response.data.url, // URL gambar yang diunggah
    });
  } catch (error) {
    console.error('Full error response:', error.response?.data || error.message);
    return res.status(500).json({
      message: 'Terjadi kesalahan saat meng-upload gambar',
      error: error.response?.data || error.message,
    });
  }
};
