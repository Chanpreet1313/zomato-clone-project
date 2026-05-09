import path from "path";
import bcrypt from "bcrypt";
import Restaurant from "../model/Restaurant.js";
import menuItem from "../model/menuItem.js";
import Cart from "../model/cart.js";
import Order from "../model/order.js"; 
import User from "../model/user.js";

export async function customerDashboard(req, res) {
  try {
    let msg = req.session.message;
    const user = req.session.user;

    const restaurants = await Restaurant.find();

    const menuItems = await menuItem.find({ available: true })
      .populate('restaurantId', 'restaurantName')
      .limit(30); // limit to keep it clean

    res.render(path.join("customer", "customerDashboard"), { 
      msg, 
      user, 
      restaurants,
      menuItems: menuItems || []
    });
  } catch (err) {
    console.error("Error loading customer dashboard:", err);
    res.status(500).send("Error loading customer dashboard");
  }
}

export async function searchRestaurants(req, res) {
  try {
    const msg = req.session.message;
    const user = req.session.user;
    const query = req.query.query?.trim();

    if (!query) {
      return res.redirect("/customer/customer-dashboard");
    }

    // 1️⃣ Search restaurants directly
    const restaurantMatches = await Restaurant.find({
      $or: [
        { restaurantName: { $regex: query, $options: "i" } },
        { foodType: { $regex: query, $options: "i" } },
        { location: { $regex: query, $options: "i" } }
      ]
    });

    // 2️⃣ Search menu items
    const menuMatches = await Menu.find({
      itemName: { $regex: query, $options: "i" }
    });

    // 3️⃣ Get restaurant IDs from menu items
    const restaurantIds = menuMatches.map(item => item.restaurantId);

    // 4️⃣ Fetch restaurants from those IDs
    const restaurantsFromMenu = await Restaurant.find({
      _id: { $in: restaurantIds }
    });

    // 5️⃣ Merge both results and remove duplicates
    const allRestaurants = [...restaurantMatches, ...restaurantsFromMenu];

    const uniqueRestaurants = Array.from(
      new Map(allRestaurants.map(r => [r._id.toString(), r])).values()
    );

    res.render(path.join("customer", "customerDashboard"), {
      msg,
      user,
      restaurants: uniqueRestaurants
    });

  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).send("Search failed");
  }
}

export async function getProfile(req, res) {
  try {
    const user = await User.findById(req.session.user._id).lean();

    res.render(path.join("customer","profile"), {
      user,
      success: req.session.success,
      error: req.session.error,
      activeTab: req.session.activeTab
    });

    // 🧹 Clear flash after showing
    req.session.success = null;
    req.session.error = null;
    req.session.activeTab = null;

  } catch (err) {
    res.status(500).send("Error loading profile");
  }
}

export async function getMenu(req, res) {
  try {
    const user = req.session.user;
    const { restaurantId } = req.params;

    const restaurant = await Restaurant.findById(restaurantId).lean();
    if (!restaurant) {
      return res.status(404).send("Restaurant not found");
    }

    const menuItems = await menuItem.find({ restaurantId }).lean();

    // ✅ FETCH CART ALSO
    let cartData = null;

    if (user) {
      const cart = await Cart.findOne({
        customerId: user._id,
        restaurantId: restaurantId   // 🔥 important (same restaurant)
      }).lean();

      if (cart && cart.items.length > 0) {
        cartData = cart.items.map(item => ({
          foodId: item.foodId.toString(),
          quantity: item.quantity,
          portion: item.portion
        }));
      }
    }

    res.render(path.join("customer", "showMenu"), {
      user,
      restaurant,
      menuItems,
      cartData   // ✅ SEND THIS
    });

  } catch (err) {
    console.error("Menu error:", err);
    res.status(500).send("Error loading menu");
  }
}
export async function getCart(req, res) {
  try {

    const currentUser = req.user || req.session.user;

    const userId =
      currentUser?._id || currentUser?.id;

    if (!userId) {

      req.session.message = "Login again";

      return res.redirect("/auth/login");
    }

    const cart = await Cart.findOne({
      customerId: userId
    })

    .populate(
      "restaurantId",
      "restaurantName logoImage address"
    );

    const user = req.session.user || null;

    if (cart && cart.items.length > 0) {

      const subtotal = cart.totalAmount;

      const taxRate = 5;

      const taxAmount =
        (subtotal * taxRate) / 100;

      const deliveryCharge =
        subtotal > 500 ? 0 : 40;

      const discount = 0;

      cart.subtotal = subtotal;

      cart.taxRate = taxRate;

      cart.taxAmount = taxAmount;

      cart.deliveryCharge = deliveryCharge;

      cart.discount = discount;

      cart.grandTotal =
        subtotal +
        taxAmount +
        deliveryCharge -
        discount;
    }

    res.render("customer/cart", {

      cart: cart || null,

      user,

      key_id: process.env.RAZORPAY_KEY_ID
    });

  }

  catch (err) {

    console.error("getCart error:", err);

    res.status(500).render("error", {
      message: err.message
    });
  }
}
export async function postCart(req, res) {

  try {

    const user = req.user || req.session.user;

    const customerId = user?._id;

    const {

      restaurantId,

      items,

      paymentMethod

    } = req.body;


    if (!customerId) {

      return res.status(401).json({

        message: 'Please login first'
      });
    }

    if (!items || !items.length) {

      return res.status(400).json({

        message: 'No items in cart'
      });
    }

    const enrichedItems = await Promise.all(

      items.map(async (item) => {

        const foundItem =
          await menuItem.findById(item.foodId);

        return {

          foodId: item.foodId,

          name:
            foundItem?.name ||
            foundItem?.itemName ||
            item.name ||
            'Item',

          image:
            foundItem?.image ||
            item.image ||
            '',

          foodType:
            foundItem?.foodType ||
            item.foodType ||
            'veg',

          category:
            foundItem?.category ||
            item.category ||
            'Other',

          portion:
            item.portion || 'regular',

          quantity:
            item.quantity,

          unitPrice:
            item.unitPrice,

          totalPrice:
            item.totalPrice
        };
      })
    );



    // ✅ FIND EXISTING CART
    let cart = await Cart.findOne({

      customerId,

      restaurantId
    });



    // ✅ UPDATE CART
    if (cart) {

      enrichedItems.forEach(newItem => {

        const existing =
          cart.items.find(

            i =>
              i.foodId.toString() ===
              newItem.foodId &&
              i.portion === newItem.portion
          );

        if (existing) {

          existing.quantity += newItem.quantity;

          existing.totalPrice =
            existing.unitPrice *
            existing.quantity;

        }

        else {

          cart.items.push(newItem);
        }
      });



      // ✅ UPDATE TOTAL
      cart.totalAmount =
        cart.items.reduce(

          (sum, i) =>
            sum + i.totalPrice,

          0
        );



      // ✅ SAVE PAYMENT METHOD
      cart.paymentMethod =
        paymentMethod || "COD";



      await cart.save();
    }



    // ✅ CREATE NEW CART
    else {

      cart = await Cart.create({

        customerId,

        restaurantId,

        items: enrichedItems,

        totalAmount:
          enrichedItems.reduce(

            (sum, i) =>
              sum + i.totalPrice,

            0
          ),



        // ✅ SAVE PAYMENT METHOD
        paymentMethod:
          paymentMethod || "COD"
      });
    }



    console.log(
      'Cart saved successfully:',
      cart
    );



    return res.status(200).json({

      success: true,

      cart
    });

  }

  catch (err) {

    console.error(
      'postCart error:',
      err
    );

    return res.status(500).json({

      message: 'Failed to save cart'
    });
  }
}

export async function placeOrder(req, res) {
  try {

    const user = req.user || req.session.user;
    const customerId = user?._id;

    if (!customerId) {
      return res.status(401).json({
        success: false,
        message: "Login required"
      });
    }

    // ✅ GET CART
    const cart = await Cart.findOne({ customerId });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No items in cart"
      });
    }

    // ✅ BILL CALCULATION
    const subtotal = cart.totalAmount;

    const taxRate = 5;

    const taxAmount = (subtotal * taxRate) / 100;

    const deliveryCharge =
      subtotal > 500 ? 0 : 40;

    const discount = 0;

    const grandTotal =
      subtotal +
      taxAmount +
      deliveryCharge -
      discount;

    // ✅ MAP ITEMS
    const orderItems = cart.items.map(item => ({
      foodId: item.foodId,
      name: item.name,
      image: item.image,
      foodType: item.foodType,
      portion: item.portion,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice
    }));


    // ✅ PAYMENT DATA
    const paymentMethod =
      (req.body.paymentMethod || "COD").toUpperCase();

    // ✅ PAYMENT STATUS
    let paymentStatus =
      paymentMethod === "ONLINE"
        ? "paid"
        : "pending";


    // ✅ CREATE ORDER
    const newOrder = await Order.create({

      userId: customerId,

      restaurantId: cart.restaurantId,

      items: orderItems,

      subtotal,
      taxRate,
      taxAmount,
      deliveryCharge,
      discount,
      grandTotal,

      address: req.body.address || {},

      note: req.body.note || "",

      // ✅ PAYMENT
      paymentMethod,
      paymentStatus,

      // ✅ RAZORPAY DETAILS
      razorpay_order_id:
        req.body.razorpay_order_id || null,

      razorpay_payment_id:
        req.body.razorpay_payment_id || null,

      orderStatus: "placed"
    });

    console.log("Order saved:", newOrder);

    // ✅ CLEAR CART
    // COD → immediately
    // ONLINE → after successful payment
    await Cart.deleteOne({
      _id: cart._id
    });

    // ✅ RESPONSE
    return res.status(200).json({
      success: true,
      message:
        paymentMethod === "ONLINE"
          ? "Payment & Order Successful"
          : "Order placed successfully",

      orderId: newOrder._id,

      order: newOrder
    });

  } catch (err) {

    console.error("Order error:", err);

    return res.status(500).json({
      success: false,
      message: "Order failed"
    });
  }
}

export async function getOrder(req, res) {
  try {
    const user = req.user || req.session.user;
    const userId = user?._id;

    if (!userId) {
      return res.redirect("/auth/login");
    }

    // ✅ Fetch user orders
    const orders = await Order.find({ userId })
      .populate("restaurantId", "restaurantName logoImage")
      .sort({ createdAt: -1 })
      .lean();

    
    const formattedOrders = orders.map(order => {
      return {
        ...order,
        statusText: order.orderStatus.charAt(0).toUpperCase() + order.orderStatus.slice(1),
        isDelivered: order.orderStatus === "delivered",
        isActive: !["delivered", "cancelled"].includes(order.orderStatus)
      };
    });

    res.render(path.join("customer", "myOrder"), {
      user,
      orders: formattedOrders
    });

  } catch (err) {
    console.error("getOrder error:", err);
    res.status(500).send("Error loading orders");
  }
}

export async function updateCart(req, res) {
  try {
    const user = req.user || req.session.user;
    const customerId = user?._id;

    const { itemId, quantity } = req.body;

    const cart = await Cart.findOne({ customerId });

    if (!cart) {
      return res.json({ success: false, message: "Cart not found" });
    }

    const item = cart.items.find(
      i => i._id.toString() === itemId || i.foodId.toString() === itemId
    );

    if (!item) {
      return res.json({ success: false, message: "Item not found" });
    }

    item.quantity = quantity;
    item.totalPrice = item.unitPrice * quantity;

    cart.totalAmount = cart.items.reduce((sum, i) => sum + i.totalPrice, 0);

    await cart.save();

    res.json({ success: true, cart });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Update failed" });
  }
}

export async function removeCartItem(req, res) {
  try {
    const user = req.user || req.session.user;
    const customerId = user?._id;

    const { itemId } = req.body;

    const cart = await Cart.findOne({ customerId });

    if (!cart) {
      return res.json({ success: false, message: "Cart not found" });
    }

    cart.items = cart.items.filter(
      i => i._id.toString() !== itemId && i.foodId.toString() !== itemId
    );

    cart.totalAmount = cart.items.reduce((sum, i) => sum + i.totalPrice, 0);

    await cart.save();

    res.json({ success: true, cart });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Remove failed" });
  }
}

export async function updateProfile(req, res) {
  try {
    const sessionUser = req.session.user;

    if (!sessionUser) {
      return res.redirect("/auth/login");
    }

    const { name, phone } = req.body;

    // 🔒 Validation
    if (!name) {
      req.session.error = "Name is required";
      return res.redirect("/customer/profile");
    }

    // ✅ Update DB
    const updatedUser = await User.findByIdAndUpdate(
      sessionUser._id,
      { name, phone },
      { new: true }
    );

    // ✅ Update session
    req.session.user.name = updatedUser.name;

    // ✅ Flash message
    req.session.success = "Profile updated successfully";

    // 🔥 REDIRECT (IMPORTANT)
    return res.redirect("/customer/profile");

  } catch (err) {
    console.error("Update profile error:", err);

    req.session.error = "Something went wrong";
    return res.redirect("/customer/profile");
  }
}

export async function changePassword(req, res) {
  try {
    const sessionUser = req.session.user;

    if (!sessionUser) {
      return res.redirect("/auth/login");
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    const user = await User.findById(sessionUser._id);

    // 🔒 Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      req.session.error = "All fields are required";
      req.session.activeTab = "password";
      return res.redirect("/customer/profile");
    }

    if (newPassword !== confirmPassword) {
      req.session.error = "Passwords do not match";
      req.session.activeTab = "password";
      return res.redirect("/customer/profile");
    }

    if (newPassword.length < 6) {
      req.session.error = "Password must be at least 6 characters";
      req.session.activeTab = "password";
      return res.redirect("/customer/profile");
    }

    // 🔐 Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      req.session.error = "Incorrect current password";
      req.session.activeTab = "password";
      return res.redirect("/customer/profile");
    }

    // 🔐 Update password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    req.session.success = "Password updated successfully";

    return res.redirect("/customer/profile");

  } catch (err) {
    console.error("Password change error:", err);

    req.session.error = "Something went wrong";
    req.session.activeTab = "password";
    return res.redirect("/customer/profile");
  }
}