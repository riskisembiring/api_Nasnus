import axios from "axios";
import FormData from "form-data";
import { createImagekitAuthHeader } from "../config/imagekit.js";

export const uploadImagekitHandlerMak = async (req, res) => {
  const { file } = req;

  if (!file) {
    return res.status(400).json({ message: "File tidak ditemukan" });
  }

  try {
    if (!file.buffer) {
      return res.status(400).json({ message: "File buffer tidak ditemukan" });
    }

    const formData = new FormData();

    formData.append("file", file.buffer, file.originalname);
    formData.append("fileName", file.originalname || "default.jpg");
    formData.append("folder", "makImages");

    const response = await axios.post(
      "https://upload.imagekit.io/api/v1/files/upload",
      formData,
      {
        headers: {
          Authorization: createImagekitAuthHeader(),
          ...formData.getHeaders(),
        },
      },
    );

    return res.status(200).json({
      message: "Upload berhasil",
      data: response.data.url,
    });
  } catch (error) {
    console.error("Full error response:", error.response?.data || error.message);
    return res.status(500).json({
      message: "Terjadi kesalahan saat meng-upload gambar",
      error: error.response?.data || error.message,
    });
  }
};
