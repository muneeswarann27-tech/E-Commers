import { motion } from "framer-motion";
import { useCartStore } from "../stores/useCartStore";
import { Link } from "react-router-dom";
import { MoveRight } from "lucide-react";
import axios from "../lib/axios";

const OrderSummary = () => {
  const { total, subtotal, coupon, isCouponApplied, cart } = useCartStore();

  const savings = subtotal - total;
  const formattedSubtotal = subtotal.toFixed(2);
  const formattedTotal = total.toFixed(2);
  const formattedSavings = savings.toFixed(2);

  const handlePayment = async () => {
    try {
      const res = await axios.post(
        "/payments/create-checkout-session",
        {
          products: cart,
          couponCode: coupon ? coupon.code : null,
        },
        { withCredentials: true },
      );

      const { id: orderId, key, totalAmount } = res.data;

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        const options = {
          key,
          amount: totalAmount * 100,
          currency: "INR",
          name: "E-Commerce Store",
          description: "Purchase Products",
          order_id: orderId,

          handler: async (response) => {
            try {
              const verifyRes = await axios.post(
                "/payments/verify-payment",
                {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  products: cart,
                  couponCode: coupon ? coupon.code : null,
                  totalAmount,
                },
                { withCredentials: true },
              );

              if (verifyRes.data.success) {
                const { clearCart } = useCartStore.getState();
                clearCart();

                window.location.href = "/purchase-success";
              }
            } catch (error) {
              console.error("Verification Error:", error);
              alert("Payment verification failed");
            }
          },

          prefill: {
            name: "Customer",
            email: "customer@example.com",
            contact: "9999999999",
          },

          theme: {
            color: "#10b981",
          },
        };

        const razorpay = new window.Razorpay(options);

        razorpay.on("payment.failed", function (response) {
          console.error(response.error);
          alert(response.error.description);
        });

        razorpay.open();
      };

      script.onerror = () => {
        alert("Failed to load Razorpay SDK");
      };
    } catch (error) {
      console.error(error);
      alert("Failed to create order");
    }
  };

  return (
    <motion.div
      className="space-y-4 rounded-lg border border-gray-700 bg-gray-800 p-4 shadow-sm sm:p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <p className="text-xl font-semibold text-emerald-400">Order summary</p>

      <div className="space-y-4">
        <div className="space-y-2">
          <dl className="flex items-center justify-between gap-4">
            <dt className="text-base font-normal text-gray-300">
              Original price
            </dt>
            <dd className="text-base font-medium text-white">
              ₹{formattedSubtotal}
            </dd>
          </dl>

          {savings > 0 && (
            <dl className="flex items-center justify-between gap-4">
              <dt className="text-base font-normal text-gray-300">Savings</dt>
              <dd className="text-base font-medium text-emerald-400">
                -₹{formattedSavings}
              </dd>
            </dl>
          )}

          {coupon && isCouponApplied && (
            <dl className="flex items-center justify-between gap-4">
              <dt className="text-base font-normal text-gray-300">
                Coupon ({coupon.code})
              </dt>
              <dd className="text-base font-medium text-emerald-400">
                -{coupon.discountPercentage}%
              </dd>
            </dl>
          )}
          <dl className="flex items-center justify-between gap-4 border-t border-gray-600 pt-2">
            <dt className="text-base font-bold text-white">Total</dt>
            <dd className="text-base font-bold text-emerald-400">
              ₹{formattedTotal}
            </dd>
          </dl>
        </div>

        <motion.button
          className="flex w-full items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handlePayment}
        >
          Proceed to Checkout
        </motion.button>

        <div className="flex items-center justify-center gap-2">
          <span className="text-sm font-normal text-gray-400">or</span>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 underline hover:text-emerald-300 hover:no-underline"
          >
            Continue Shopping
            <MoveRight size={16} />
          </Link>
          
        </div>
		<div className="rounded-lg border border-yellow-500 bg-yellow-500/10 p-3 text-sm text-yellow-300">
            ⚠️ Razorpay Test Mode: UPI payments may fail in testing. Please use{" "}
            <strong>Net Banking</strong> for successful demo transactions.
          </div>
      </div>
    </motion.div>
  );
};
export default OrderSummary;
