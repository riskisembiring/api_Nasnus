import { addUserHandler } from "./api/add-user.js";
import { loginHandler } from "./api/login.js";
import { forgotPasswordHandler } from "./api/forgot-password.js";
import { resetPasswordHandler } from "./api/reset-password.js";
import { sendEmailOTPHandler } from "./api/send-email-otp.js";
import { verifyEmailOTPHandler } from "./api/verify-email-otp.js";
import { submitKreditHandler } from "./api/kredit.js";
import {
  addDataHandler,
  updateDataHandler,
  getDataHandler,
} from "./api/data.js";
import {
  addDataMakHandler,
  updateDataMakHandler,
  getDataMakHandler,
  deleteDataMakHandler,
} from "./api/data-mak.js";
import { uploadImagekitHandler } from "./api/upload.js";
import { uploadImagekitHandlerMak } from "./api/uploadMak.js";
import { deleteImagekitHandler } from "./api/delete-imagekit.js";
import { cleanupDataHandler } from "./api/cleanup-data.js";
import { updateUserHandler } from "./api/update-user.js";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

// Fungsi untuk menangani CORS
const setCorsHeaders = (res) => {
  res.setHeader("Access-Control-Allow-Origin", "*"); // Mengizinkan akses dari semua domain
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  ); // Metode HTTP yang diizinkan
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization"); // Header yang diizinkan
};

// Ekspor handler utama untuk Vercel
export default async function handler(req, res) {
  const { url, method } = req;

  // Menangani preflight request (OPTIONS) untuk CORS
  if (method === "OPTIONS") {
    setCorsHeaders(res);
    return res.status(200).end(); // Mengirim respons kosong dengan status 200
  }

  try {
    // Menambahkan CORS untuk setiap respons
    setCorsHeaders(res);

    // Menangani rute sesuai dengan URL dan metode
    if (url === "/api/add-user" && method === "POST") {
      return addUserHandler(req, res);
    } else if (url === "/api/login" && method === "POST") {
      return loginHandler(req, res);
    } else if (url === "/api/forgot-password" && method === "POST") {
      return forgotPasswordHandler(req, res);
    } else if (url === "/api/reset-password" && method === "POST") {
      return resetPasswordHandler(req, res);
    } else if (url === "/api/send-email-otp" && method === "POST") {
      return sendEmailOTPHandler(req, res);
    } else if (url === "/api/verify-email-otp" && method === "POST") {
      return verifyEmailOTPHandler(req, res);
    } else if (url === "/api/data" && method === "POST") {
      return addDataHandler(req, res);
    } else if (url.startsWith("/api/data") && method === "PUT") {
      const id = url.split("/")[3]; // Mengambil ID dari URL
      req.params = { id };
      return updateDataHandler(req, res);
    } else if (url === "/api/data" && method === "GET") {
      return getDataHandler(req, res);
    } else if (url === "/api/submit-kredit" && method === "POST") {
      return submitKreditHandler(req, res);
    } else if (url === "/api/data-mak" && method === "POST") {
      return addDataMakHandler(req, res);
    } else if (url.startsWith("/api/update-mak") && method === "PUT") {
      const id = url.split("/")[3];
      req.params = { id };
      return updateDataMakHandler(req, res);
    } else if (url === "/api/data-mak" && method === "GET") {
      return getDataMakHandler(req, res);
    } else if (url === "/api/delete-mak" && method === "DELETE") {
      return deleteDataMakHandler(req, res);
    } else if (url === "/api/upload" && method === "POST") {
      return upload.single("file")(req, res, (err) => {
        if (err) {
          return res.status(500).json({
            message: "Terjadi kesalahan saat meng-upload file",
            error: err.message,
          });
        }
        return uploadImagekitHandler(req, res);
      });
    } else if (url === "/api/uploadMak" && method === "POST") {
      return upload.single("file")(req, res, (err) => {
        if (err) {
          return res.status(500).json({
            message: "Terjadi kesalahan saat meng-upload file",
            error: err.message,
          });
        }
        return uploadImagekitHandlerMak(req, res);
      });
    } else if (url === "/api/delete-imagekit" && method === "POST") {
      return deleteImagekitHandler(req, res);
    } else if (url === "/api/cleanup-data" && method === "POST") {
      return cleanupDataHandler(req, res);
    } else if (url === "/api/update-user" && method === "PUT") {
      return updateUserHandler(req, res);
    }

    return res.status(404).json({ message: "Rute tidak ditemukan" });
  } catch (error) {
    // Tangani error dengan mengirimkan respons error yang lebih baik
    console.error("Error handling request:", error);
    return res
      .status(500)
      .json({ message: "Terjadi kesalahan pada server", error: error.message });
  }
}
