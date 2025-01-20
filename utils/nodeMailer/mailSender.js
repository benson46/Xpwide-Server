import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

// Configure SMTP transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: process.env.SMTP_PORT || 587,
  secure: false, // Use TLS
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASS,
  }
});

// Send mail function
const mailSender = async (email, subject, html) => {
  if (!process.env.NODEMAILER_EMAIL || !process.env.NODEMAILER_PASS) {
    throw new Error("Missing email credentials in environment variables");
  }
  try {
    const info = await transporter.sendMail({
      from: `"XPWide" <${process.env.NODEMAILER_EMAIL}>`, // Sender address
      to: email, // List of recipients
      subject, // Subject line
      html, // HTML body
    });
    return info;
  } catch (error) {
    throw new Error("Failed to send email.");
  }
};

export default mailSender;
