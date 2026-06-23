import Coupon from "../models/coupon.model.js";
import Order from "../models/order.model.js";
import { razorpay } from "../lib/razorpay.js";
import crypto from "crypto";

export const createCheckoutSession = async (req, res) => {
	try {
		const { products, couponCode } = req.body;

		if (!Array.isArray(products) || products.length === 0) {
			return res.status(400).json({
				error: "Invalid or empty products array",
			});
		}

		let totalAmount = 0;

		products.forEach((product) => {
			totalAmount +=
				Math.round(product.price * 100) *
				product.quantity;
		});

		let coupon = null;

		if (couponCode) {
			coupon = await Coupon.findOne({
				code: couponCode,
				userId: req.user._id,
				isActive: true,
			});

			if (coupon) {
				totalAmount -= Math.round(
					(totalAmount *
						coupon.discountPercentage) /
						100
				);
			}
		}

		const razorpayOrder =
			await razorpay.orders.create({
				amount: totalAmount,
				currency: "INR",
				receipt: `ORD-${Date.now()}`,
			});

		res.status(200).json({
			id: razorpayOrder.id,
			totalAmount: totalAmount / 100,
			key: process.env.RAZERPAY_API_KEY,
		});
	} catch (error) {
		console.error(error);

		res.status(500).json({
			message: "Error creating order",
		});
	}
};

export const verifyPayment = async (req, res) => {
	try {
		const {
			razorpay_order_id,
			razorpay_payment_id,
			razorpay_signature,
			products,
			couponCode,
			totalAmount,
		} = req.body;

		const body =
			razorpay_order_id +
			"|" +
			razorpay_payment_id;

		const expectedSignature = crypto
			.createHmac(
				"sha256",
				process.env.RAZERPAY_SECREATE_KEY
			)
			.update(body)
			.digest("hex");

		if (
			process.env.NODE_ENV === "production" &&
			expectedSignature !== razorpay_signature
		) {
			return res.status(400).json({
				success: false,
				message: "Payment verification failed",
			});
		}

		if (couponCode) {
			await Coupon.findOneAndUpdate(
				{
					code: couponCode,
					userId: req.user._id,
				},
				{
					isActive: false,
				}
			);
		}

		const order = new Order({
			user: req.user._id,
			products: products.map((item) => ({
				product: item._id,
				quantity: item.quantity,
				price: item.price,
			})),
			totalAmount,
			razorpayOrderId:
				razorpay_order_id,
			razorpayPaymentId:
				razorpay_payment_id,
		});

		await order.save();

		req.user.cartItems = [];
		await req.user.save();

		res.status(200).json({
			success: true,
			orderId: order._id,
		});
	} catch (error) {
		console.error(error);

		res.status(500).json({
			message: "Payment verification failed",
		});
	}
};