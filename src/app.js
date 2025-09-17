import express from 'express';
import router from './routes/index.js';
import { connectDB } from './config/db.js';  
import authRoute from './routes/auth/auth_route.js';
import cors from 'cors';
import roomRoute from './routes/room/room_route.js';
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/users/', router);
app.use('/api/users/', authRoute);
app.use('/api/users/', roomRoute);

// Start server only after DB connects
(async () => {
  try {
    await connectDB(); 
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1); 
  }
})();
