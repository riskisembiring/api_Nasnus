import axios from "axios";

export const deleteImagekitHandler = async (req, res) => {
  try {
    const privateKey = "private_5AhqwfLNexuB+St9QoDexd+y5hs=";
    const folder = "bprNasnus/";

    // Hitung tanggal 3 bulan yang lalu
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 3);

    const authHeader = `Basic ${Buffer.from(privateKey + ":").toString("base64")}`;

    // Ambil list file
    const listResponse = await axios.get(
      `https://api.imagekit.io/v1/files?path=${encodeURIComponent(folder)}&limit=1000`,
      {
        headers: {
          Authorization: authHeader,
        },
      }
    );

    const files = listResponse.data || [];
    let deletedCount = 0;
    const errors = [];

    console.log("Total files:", files.length);
    console.log("Cutoff date:", cutoffDate);

    for (const file of files) {
      const createdAt = new Date(file.createdAt);

      console.log("File:", file.name);
      console.log("Created:", createdAt);

      if (createdAt < cutoffDate) {
        try {
          await axios.delete(
            `https://api.imagekit.io/v1/files/${file.fileId}`,
            {
              headers: {
                Authorization: authHeader,
              },
            }
          );

          console.log("Deleted:", file.name);
          deletedCount++;
        } catch (err) {
          errors.push(`Gagal hapus ${file.name}: ${err.message}`);
        }
      }
    }

    return res.status(200).json({
      message: "Cleanup selesai (file lebih lama dari 3 bulan dihapus)",
      deleted: deletedCount,
      errors: errors.length ? errors : null,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: "Error saat delete file ImageKit",
      error: error.message,
    });
  }
};