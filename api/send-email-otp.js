import nodemailer from "nodemailer";
import { v4 as uuidv4 } from "uuid";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { db } from "../config/firebase-config.js";
import { loadLocalEnv } from "../config/load-env.js";

loadLocalEnv();

const gmailUser = process.env.GMAIL_USER;
const gmailPass = process.env.GMAIL_PASS;

// Transporter Gmail
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: gmailUser,
    pass: gmailPass
  }
});

// Generate OTP 6 digit
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Send Email OTP Handler
export const sendEmailOTPHandler = async (req, res) => {
  try {
    if (!gmailUser || !gmailPass) {
      return res.status(500).json({
        message: "Konfigurasi email belum lengkap",
        error: "GMAIL_USER atau GMAIL_PASS belum tersedia di environment"
      });
    }

    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({
        message: "Username dan email diperlukan"
      });
    }

    // Cari user berdasarkan username
    const q = query(
      collection(db, "users"),
      where("username", "==", username)
    );

    const userSnapshot = await getDocs(q);

    if (userSnapshot.empty) {
      return res.status(404).json({
        message: "User tidak ditemukan"
      });
    }

    const userDoc = userSnapshot.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() };

    if (user.email !== email) {
      return res.status(400).json({
        message: "Email tidak cocok dengan username"
      });
    }

    // Generate OTP
    const otp = generateOTP();
    const otpId = uuidv4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Simpan OTP
    await addDoc(collection(db, "user_verifications"), {
      userId: user.id,
      type: "email",
      code: otp,
      expiresAt,
      used: false,
      createdAt: new Date()
    });

    // Kirim email
    await transporter.sendMail({
      from: `"Nasional Nusantara" <${gmailUser}>`,
      to: email,
      subject: "Kode Verifikasi OTP",
      html: `
        <h2>Verifikasi Email</h2>
        <p>Kode OTP Anda:</p>
        <h1>${otp}</h1>
        <p>Berlaku selama <b>5 menit</b>.</p>
      `
    });

    return res.status(200).json({
      message: "OTP email berhasil dikirim",
      otpId,
      expiresIn: "5 menit"
    });

  } catch (error) {
    console.error("OTP EMAIL ERROR:", error);

    return res.status(500).json({
      message: "Gagal mengirim OTP email nih",
      error: error.message
    });
  }
};

export default sendEmailOTPHandler;
