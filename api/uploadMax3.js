import axios from 'axios';
import FormData from 'form-data';

export const uploadImagekitHandlerMax3 = async (req, res) => {
  const { files } = req; // Mengambil array file dari request

  if (!files || files.length === 0) {
    return res.status(400).json({ message: 'File tidak ditemukan' });
  }

  try {
    const privateKey = 'private_5AhqwfLNexuB+St9QoDexd+y5hs='; // Ganti dengan Private API Key ImageKit Anda
    
    // Menginisialisasi array untuk menyimpan URL hasil upload
    const uploadedUrls = [];

    // Looping untuk meng-upload setiap file
    for (let file of files) {
      if (!file.buffer) {
        return res.status(400).json({ message: 'File buffer tidak ditemukan' });
      }

      const formData = new FormData();
      formData.append('file', file.buffer, file.originalname); // Buffer dari file dan nama file
      formData.append('fileName', file.originalname || 'default.jpg'); // Nama file
      formData.append('folder', 'bprNasnus'); // Folder tujuan di ImageKit

      // Mengirim permintaan ke API ImageKit untuk masing-masing file
      const response = await axios.post('https://upload.imagekit.io/api/v1/files/upload', formData, {
        headers: {
          Authorization: `Basic ${Buffer.from(privateKey + ':').toString('base64')}`, // Basic Auth
          ...formData.getHeaders(), // Header otomatis dari FormData
        },
      });

      // Menyimpan URL gambar yang berhasil di-upload
      uploadedUrls.push(response.data.url);
    }

    // Mengirimkan respons berhasil dengan URL gambar yang sudah di-upload
    return res.status(200).json({
      message: 'Upload berhasil',
      data: uploadedUrls, // URL gambar yang di-upload
    });
  } catch (error) {
    console.error('Full error response:', error.response?.data || error.message);
    return res.status(500).json({
      message: 'Terjadi kesalahan saat meng-upload gambar',
      error: error.response?.data || error.message,
    });
  }
};
