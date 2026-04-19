import * as dotenv from 'dotenv';
dotenv.config({ path: './.env' });  // force exact path

// import dotenv from 'dotenv';
// dotenv.config();
import app from './app';

// dotenv.config();



const PORT = process.env.PORT || 3000;

const startServer = () => {
  app.listen(PORT, () => {
    console.log(`🚀 SmartVenue Backend Server is running on port ${PORT}`);
  });
};

startServer();
