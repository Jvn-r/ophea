import dotenv from 'dotenv';
dotenv.config();

export const config = {
  ocean:{
    apiKey: process.env.OCEAN_API_KEY,
  },
  prospeo:{
    apiKey: process.env.PROSPEO_API_KEY,
  },
  brevo:{
    apiKey: process.env.BREVO_API_KEY,
    senderEmail: process.env.SENDER_EMAIL,
    senderName: process.env.SENDER_NAME,
  },
};

