import axios from "axios";

const sendEmail = async (email, subject, message) => {
  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          email: process.env.BREVO_SENDER_EMAIL,
          name: "LMS Contact",
        },
        to: [{ email }],
        subject: subject,
        htmlContent: `<p>${message}</p>`,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Email sent:", response.data);
    return response.data;

  } catch (error) {
    console.error(
      "Brevo Error:",
      error?.response?.data || error.message
    );
    throw error;
  }
};

export default sendEmail;