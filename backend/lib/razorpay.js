import Razorpay from "razorpay";
import dotenv from "dotenv";

dotenv.config();

export const razorpay = new Razorpay({
	key_id: process.env.RAZERPAY_API_KEY,
	key_secret: process.env.RAZERPAY_SECREATE_KEY,
});
