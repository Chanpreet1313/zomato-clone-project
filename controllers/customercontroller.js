import path from "path";
import Restaurant from "../model/Restaurant.js";
import menuItem from "../model/menuItem.js";
import Cart from "../model/cart.js";
import Order from "../model/order.js"; 

export async function customerDashboard(req, res) {
  try {
    let msg = req.session.message;
    const user = req.session.user;

    const restaurants = await Restaurant.find();

    res.render(path.join("customer", "customerDashboard"), { msg, user, restaurants });
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
    res.render(path.join("customer", "profile"), { user });
  } catch (err) {
    console.error("Profile error:", err);
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
    const userId = currentUser?._id || currentUser?.id;

    if (!userId) {
      req.session.message = "Login again";
      return res.redirect("/auth/login");
    }

    const cart = await Cart.findOne({
      customerId: userId
    }).populate("restaurantId", "restaurantName logoImage address");

    const user = req.session.user || null;

    if (cart && cart.items.length > 0) {
      const subtotal = cart.totalAmount;
      const taxRate = 5;
      const taxAmount = (subtotal * taxRate) / 100;
      const deliveryCharge = subtotal > 500 ? 0 : 40;
      const discount = 0;

      cart.subtotal = subtotal;
      cart.taxRate = taxRate;
      cart.taxAmount = taxAmount;
      cart.deliveryCharge = deliveryCharge;
      cart.discount = discount;
      cart.grandTotal = subtotal + taxAmount + deliveryCharge - discount;
    }

    res.render("customer/cart", { cart: cart || null, user });

  } catch (err) {
    console.error("getCart error:", err);
    res.status(500).render("error", { message: err.message });
  }
}

export async function postCart(req, res) {
  try {
    const user = req.user || req.session.user;
    const customerId = user?._id;
    const { restaurantId, items } = req.body;

    if (!customerId) {
      return res.status(401).json({ message: 'Please login first' });
    }

    if (!items || !items.length) {
      return res.status(400).json({ message: 'No items in cart' });
    }

    const enrichedItems = await Promise.all(items.map(async (item) => {
      const foundItem = await menuItem.findById(item.foodId);
      console.log('menuItem from DB:', foundItem); // check terminal for field names
      return {
        foodId: item.foodId,
        name: foundItem?.name || foundItem?.itemName || item.name || 'Item',
        image: foundItem?.image || item.image || '',
        foodType: foundItem?.foodType || item.foodType || 'veg',
        category: foundItem?.category || item.category || 'Other',
        portion: item.portion || 'regular',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice
      };
    }));

    let cart = await Cart.findOne({ customerId, restaurantId });

    if (cart) {
      enrichedItems.forEach(newItem => {
        const existing = cart.items.find(
          i => i.foodId.toString() === newItem.foodId &&
            i.portion === newItem.portion
        );
        if (existing) {
          existing.quantity += newItem.quantity;
          existing.totalPrice = existing.unitPrice * existing.quantity;
        } else {
          cart.items.push(newItem);
        }
      });
      cart.totalAmount = cart.items.reduce((sum, i) => sum + i.totalPrice, 0);
      await cart.save();

    } else {
      cart = await Cart.create({
        customerId,
        restaurantId,
        items: enrichedItems,
        totalAmount: enrichedItems.reduce((sum, i) => sum + i.totalPrice, 0)
      });
    }

    console.log('Cart saved successfully:', cart);
    return res.status(200).json({ success: true, cart });

  } catch (err) {
    console.error('postCart error:', err);
    return res.status(500).json({ message: 'Failed to save cart' });
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

    // ✅ Get cart
    const cart = await Cart.findOne({ customerId });

    if (!cart || cart.items.length === 0) {
      return res.json({
        success: false,
        message: "No items in cart"
      });
    }

    // ✅ CALCULATE BILL
    const subtotal = cart.totalAmount;
    const taxRate = 5;
    const taxAmount = (subtotal * taxRate) / 100;
    const deliveryCharge = subtotal > 500 ? 0 : 40;
    const discount = 0;

    const grandTotal = subtotal + taxAmount + deliveryCharge - discount;

    // ✅ MAP CART ITEMS → ORDER ITEMS
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

    // ✅ PAYMENT HANDLING
    const paymentMethod = (req.body.paymentMethod || "COD").toUpperCase();

    let paymentStatus = "pending";

    if (paymentMethod === "COD") {
      paymentStatus = "pending"; // paid on delivery
    } 
    else if (paymentMethod === "ONLINE") {
      paymentStatus = "pending"; // will update after payment success
    }

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

      // ✅ PAYMENT FIELDS
      paymentMethod,
      paymentStatus
    });

    console.log("Order saved:", newOrder);

    // ❗ IMPORTANT:
    // For ONLINE → DON'T delete cart yet (wait for payment success)
    if (paymentMethod === "COD") {
      await Cart.deleteOne({ _id: cart._id });
    }

    // ✅ RESPONSE HANDLING

    // 🟢 ONLINE PAYMENT FLOW
    if (paymentMethod === "ONLINE") {
      return res.json({
        success: true,
        message: "Proceed to payment",
        orderId: newOrder._id,
        paymentUrl: `/payment/${newOrder._id}` // future Razorpay redirect
      });
    }

    // 🟢 COD FLOW
    return res.json({
      success: true,
      message: "Order placed successfully",
      orderId: newOrder._id
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