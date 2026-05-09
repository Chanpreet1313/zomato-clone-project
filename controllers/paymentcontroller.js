import { createRequire } from "module";
import crypto from "crypto";
import dotenv from "dotenv";

const require = createRequire(import.meta.url);
const Razorpay = require("razorpay"); 
dotenv.config();

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

export async function getCheckout(req, res) {
  try {
    // Get customer ID from session
    const customerId = req.session.customerId || req.session.user?._id;

    if (!customerId) {
      return res.redirect('/customer/login');
    }

    // Fetch cart from DB with restaurant & menu item details
    const cart = await Cart.findOne({ customerId })
      .populate('restaurantId')
      .populate('items.menuItemId');

    if (!cart || cart.items.length === 0) {
      return res.redirect('/customer/cart');
    }

    // Render checkout page
    res.render(path.join("customer","checkout"), {
      cart,
      key_id: process.env.RAZORPAY_KEY_ID
    });

  } catch (err) {
    console.error('getCheckout error:', err);
    res.status(500).send('Something went wrong');
  }
}

export async function createOrder(req, res) {

  try {

    const { amount } = req.body;

    const options = {
      amount: amount * 100, // convert to paise
      currency: "INR",
      receipt: "receipt_" + Date.now()
    };

    const order = await razorpayInstance.orders.create(options);

    res.json(order);

  } catch (err) {

    console.error("createOrder error:", err);

    res.status(500).json({
      success: false,
      message: "Order creation failed"
    });
  }
}

export async function verifyPayment(req,res){
    try {

    const {

      razorpay_order_id,

      razorpay_payment_id,

      razorpay_signature

    } = req.body;

    const generated_signature =
      crypto
        .createHmac(
          "sha256",
          process.env.RAZORPAY_KEY_SECRET
        )
        .update(
          razorpay_order_id +
          "|" +
          razorpay_payment_id
        )
        .digest("hex");

    if (
      generated_signature ===
      razorpay_signature
    ) {

      return res.json({
        success: true
      });
    }

    else {

      return res.status(400).json({

        success: false,

        message: "Invalid signature"
      });
    }

  }

  catch(err) {

    console.log(err);

    res.status(500).json({

      success: false,

      message: "Verification failed"
    });
  }
}