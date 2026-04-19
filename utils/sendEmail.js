import nodemailer from "nodemailer";

const sendEmail = async function (email, subject, message) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT), // ✅ FIXED
    secure: false, // correct for 587
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // 🔍 DEBUG: check connection first
  await transporter.verify();

  // 📧 send mail
  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM_EMAIL,
    to: email,
    subject: subject,
    html: message,
  });

  console.log("Email sent:", info.messageId);
};

export default sendEmail;