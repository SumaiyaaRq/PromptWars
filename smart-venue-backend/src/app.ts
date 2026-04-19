import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/error.middleware';
import './config/firebase'; // Initialize Firebase

const app: Application = express();

// Middleware
app.use(cors({
  origin: ['https://smart-venue-frontend-201631981798.us-central1.run.app', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});


import { db } from './config/firebase';

app.get('/test-firebase', async (req, res) => {
  try {
    await db.collection('test').doc('check').set({
      message: 'Firebase is working',
      time: new Date()
    });

    res.json({ success: true, message: 'Firebase connected' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error });
  }
});

// TODO: Mount business logic routes here in future phases
import venueRoutes from './routes/venue.routes';
app.use('/api/v1/venues', venueRoutes);

// Global Error Handler (must be the last middleware)
app.use(errorHandler);

export default app;
