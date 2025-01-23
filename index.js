import express from 'express';
import cors from 'cors';
import { addUserHandler } from './api/add-user.js';
import { loginHandler } from './api/login.js';
import { addDataHandler, updateDataHandler, getDataHandler } from './api/data.js';

const app = express();

// Menggunakan PORT dari environment, jika ada, atau fallback ke 5000
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/add-user', addUserHandler);
app.use('/login', loginHandler);
app.post('/api/data', addDataHandler); // Menggunakan addDataHandler pada route /api/data
app.put('/api/data/:id', updateDataHandler); // Menggunakan updateDataHandler untuk update data
app.get('/api/data', getDataHandler);

// Start Server
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
