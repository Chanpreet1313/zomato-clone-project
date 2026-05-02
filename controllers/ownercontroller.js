import path from "path";
import mongoose from "mongoose";
import Restaurant from "../model/Restaurant.js";
import menu from "../model/menuItem.js";
import User from "../model/user.js";
import Order from "../model/order.js";

export async function ownerDashboard(req, res) {
  try {
    let msg = req.session.message;
    const user = req.session.user;

    if (!user) {
      return res.redirect("/auth/login");
    }

    const ownerId = user.id || user._id;

    // ✅ Get owner's restaurants
    const restaurants = await Restaurant.find({ ownerId });
    const restaurantIds = restaurants.map(r => r._id);

    // ✅ TRENDING ITEMS
    const trendingItems = await menu.find({ restaurantId: { $in: restaurantIds } })
      .sort({ totalSales: -1 })
      .limit(8)
      .lean();

    // ✅ ALL MENU ITEMS (for categories)
    const allMenuItems = await menu.find({ restaurantId: { $in: restaurantIds } }).lean();

    const menuCategories = [
      ...new Map(
        allMenuItems.map(item => [
          item.category,
          {
            name: item.category,
            image: item.image || "https://cdn-icons-png.flaticon.com/128/1046/1046784.png"
          }
        ])
      ).values()
    ];

    // ✅ ORDERS (FIXED populate)
    const orders = await Order.find({
      restaurantId: { $in: restaurantIds }
    })
      .populate("userId", "name email address") // ✅ FIXED HERE
      .sort({ createdAt: -1 })
      .lean();

    // ✅ Total Orders
    const totalOrders = orders.length;

    // ✅ Total Earnings
    const totalEarnings = orders.reduce((sum, order) => {
      if (order.orderStatus !== "cancelled") {
        return sum + order.grandTotal;
      }
      return sum;
    }, 0);

    // ✅ Recent Orders (FIXED ADDRESS)
    const recentOrders = orders.slice(0, 5).map(order => {
      const userAddress = order.userId?.address;

      const addressParts = userAddress
        ? [
          userAddress.street,
          userAddress.city,
          userAddress.state,
          userAddress.pincode,
        ].filter(Boolean)
        : [];

      return {
        customerName: order.userId?.name || "Customer",
        orderNumber: order._id.toString().slice(-6).toUpperCase(),
        address: addressParts.join(", ") || "N/A", // ✅ FIXED
        amount: order.grandTotal,
        status: order.orderStatus
      };
    });

    // ✅ Latest Order (FIXED ADDRESS FROM USER MODEL)
    let latestOrder = null;

    if (orders.length > 0) {
      const latestUserAddress = orders[0]?.userId?.address;

      const latestAddressParts = latestUserAddress
        ? [
          latestUserAddress.street,
          latestUserAddress.city,
          latestUserAddress.state,
          latestUserAddress.pincode,
        ].filter(Boolean)
        : [];

      latestOrder = {
        _id: orders[0]._id,
        orderNumber: orders[0]._id.toString().slice(-6).toUpperCase(),
        orderType: "Delivery",
        deliveryAddress: latestAddressParts.join(", ") || "N/A", // ✅ FIXED
        estimatedTime: "20 min",
        items: orders[0].items.map(i => ({
          name: i.name,
          image: i.image,
          quantity: i.quantity,
          price: i.unitPrice
        })),
        subTotal: orders[0].subtotal,
        deliveryCharge: orders[0].deliveryCharge,
        discount: orders[0].discount,
        total: orders[0].grandTotal,
        status: orders[0].orderStatus
      };
    }

    const pendingStatuses = ["placed", "confirmed", "preparing", "ready", "picked"];

    const pendingCount = orders.filter((o) =>
      pendingStatuses.includes((o.orderStatus || "placed"))
    ).length;

    // ✅ Render
    res.render(path.join("restaurant", "ownerdashboard"), {
      msg,
      user,
      restaurants,
      trendingItems,
      menuCategories,
      totalOrders,
      totalEarnings,
      recentOrders,
      _pending: pendingCount,
      latestOrder
    });

  } catch (err) {
    console.error("❌ Dashboard Error:", err);
    res.status(500).send("Error loading dashboard");
  }
}
export function createRestaurant(req, res) {
  let msg = req.session.message;
  req.session.message = "";
  const user = req.session.user;
  res.render(path.join("restaurant", "createRestaurant"), { msg, user });
}

export async function postRestaurant(req, res) {
  try {
    const { restaurantName, foodType, location } = req.body;
    const user = req.user;
    const ownerId = user.id || user._id;
    const logoImage = req.file ? `/restaurant-uploads/${req.file.filename}` : null;

    const restaurant = new Restaurant({
      ownerId,
      restaurantName,
      foodType,
      logoImage,
      location
    });

    await restaurant.save();

    res.redirect('/owner/owner-dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error creating restaurant');
  }
}

export async function addMenu(req, res) {
  let msg = req.session.message;
  req.session.message = "";

  const user = req.session.user;

  const { id } = req.params;


  const selectedRestaurant = await Restaurant.findById(id);

  if (!selectedRestaurant) {
    return res.status(404).send("Restaurant not found");
  }

  res.render(path.join("restaurant", "addMenu"), {
    msg,
    user,
    selectedRestaurant
  });
}

export async function postMenu(req, res) {
  try {
    const {
      restaurantId,
      itemName,
      foodType,
      price,
      category,
      available,
      hasHalfFullOption,
      halfPrice,
      fullPrice
    } = req.body;

    const isHalfFull = hasHalfFullOption === "true";
    const image = req.file ? `/menu-uploads/${req.file.filename}` : null;

    const menuItem = new menu({
      restaurantId,
      itemName,
      foodType,
      hasHalfFullOption: isHalfFull,
      halfPrice: isHalfFull && halfPrice ? Number(halfPrice) : null,
      fullPrice: isHalfFull && fullPrice ? Number(fullPrice) : null,
      price: !isHalfFull && price ? Number(price) : null,
      image,
      category,
      available: available === "true"
    });

    await menuItem.save();
    req.session.message = "Menu item added successfully!";
    res.redirect("/owner/owner-dashboard");

  } catch (err) {
    console.error("Error adding menu item:", err);
    res.status(500).send("Error adding menu item");
  }
}
export async function getMenu(req, res) {
  try {
    const user = req.session.user;
    const { id } = req.params;

    const restaurant = await Restaurant.findById(id).lean();
    if (!restaurant) {
      return res.status(404).send("Restaurant not found");
    }

    const menus = await menu.find({ restaurantId: id }).lean();

    res.render(path.join("restaurant", "showMenu"), {
      user,
      restaurant,
      menus
    });

  } catch (err) {
    console.error("Show menu error:", err);
    res.status(500).send("Error loading menu");
  }
}

export async function getEditMenu(req, res) {
  try {
    const user = req.session.user;
    const ownerId = user.id;
    const restaurants = await Restaurant.find({ ownerId });
    const menuItem = await menu.findById(req.params.id).lean();
    if (!menuItem) return res.status(404).send("Item not found");

    // Pass editMode flag and the item data
    res.render(path.join("restaurant", "addMenu"), {
      user,
      restaurants,
      msg: "",
      editMode: true,
      menuItem
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading edit form");
  }
}

export async function postEditMenu(req, res) {
  try {
    const { itemName, foodType, price, category, available, hasHalfFullOption, halfPrice, fullPrice } = req.body;
    const isHalfFull = hasHalfFullOption === "true";

    const updateData = {
      itemName,
      foodType,
      category,
      available: available === "true",
      hasHalfFullOption: isHalfFull,
      halfPrice: isHalfFull && halfPrice ? Number(halfPrice) : null,
      fullPrice: isHalfFull && fullPrice ? Number(fullPrice) : null,
      price: !isHalfFull && price ? Number(price) : null,
    };
    if (req.file) updateData.image = `/menu-uploads/${req.file.filename}`;
    await menu.findByIdAndUpdate(req.params.id, updateData);
    const updated = await menu.findById(req.params.id);
    res.redirect(`/owner/show-menu/${updated.restaurantId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating item");
  }
}

export async function deleteMenu(req, res) {
  try {
    const deleted = await menu.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Item not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function toggleRestaurant(req, res) {
  try {
    const { id } = req.params;
    const { isOpen } = req.body;
    console.log("id:", id);
    console.log("isOpen:", isOpen);
    console.log("body:", req.body);
    await Restaurant.findByIdAndUpdate(id, { isOpen });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
}

export async function ownerSearch(req, res) {
  const query = req.query.query;

  const restaurants = await Restaurant.find({
    restaurantName: { $regex: query, $options: "i" },
    ownerId: req.user._id
  });

  res.render("owner/dashboard", {
    restaurants,
    user: req.user
  });
}

export async function getOwnerProfile(req, res) {
  try {
    const userId = req.session.user?._id;

    if (!userId) return res.redirect("/auth/login");

    const user = await User.findById(userId).select("-password");

    if (!user) return res.redirect("/auth/login");

    res.render(path.join("restaurant", "profile"), { user });

  } catch (error) {
    console.error("getOwnerProfile error:", error);
    res.status(500).send("Internal Server Error");
  }
}


export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    const userId = req.session.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);

    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });

  } catch (error) {
    console.error("changePassword error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

export async function updateProfileInfo(req, res) {
  try {
    const { firstName, lastName, name, email, phone } = req.body;

    const userId = req.session.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const updated = await User.findByIdAndUpdate(
      userId,
      { firstName, lastName, name, email, phone },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updated) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // ✅ Update session (IMPORTANT)
    req.session.user = updated;

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updated
    });

  } catch (error) {
    console.error("updatePersonalInfo error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

export async function getOrder(req, res) {
  try {
    const ownerId = req.user._id;

    // Step 1: Find all restaurants belonging to this owner
    const ownerRestaurants = await Restaurant.find({ ownerId: ownerId })
      .select("_id restaurantName")
      .lean();

    if (!ownerRestaurants.length) {
      const isPartial =
        req.query.partial === "true" ||
        req.headers["x-requested-with"] === "XMLHttpRequest";

      return res.render(path.join("restaurant", "order"), {
        orders: [],
        totalOrders: 0,
        pendingCount: 0,
        completedCount: 0,
        cancelledCount: 0,

        user: req.user,
        ...(isPartial && { layout: false }),
      });
    }

    const restaurantIds = ownerRestaurants.map((r) => r._id);

    // Step 2: Fetch all orders
    const rawOrders = await Order.find({
      restaurantId: { $in: restaurantIds },
    })
      .populate("userId", "name email profileImage address")
      .populate("restaurantId", "restaurantName")
      .sort({ createdAt: -1 })
      .lean();

    // Step 3: Map orders (🔥 FIX APPLIED HERE)
    const orders = rawOrders.map((order) => {
      const userAddress = order.userId?.address;

      const addressParts = userAddress
        ? [
          userAddress.street,
          userAddress.city,
          userAddress.state,
          userAddress.pincode,
        ].filter(Boolean)
        : [];

      // ✅ Normalize status safely
      const normalizedStatus = (order.orderStatus || "placed").toLowerCase();

      return {
        _id: order._id,
        orderNumber: order._id.toString().slice(-6).toUpperCase(),

        customerName: order.userId?.name || "Unknown Customer",
        customerAvatar: order.userId?.profileImage || null,
        customerPhone: order.address?.phone || null,
        restaurantName: order.restaurantId?.restaurantName || "",

        address: addressParts.join(", ") || "N/A",

        // Financials
        subtotal: order.subtotal || 0,
        taxAmount: order.taxAmount || 0,
        deliveryCharge: order.deliveryCharge || 0,
        discount: order.discount || 0,
        amount: order.grandTotal || 0,

        // ✅ FIXED STATUS
        status: normalizedStatus,

        ownerStatus: order.ownerStatus || "pending",
        paymentMethod: (order.paymentMethod || "COD").toUpperCase(),
        paymentStatus: (order.paymentStatus || "pending").toLowerCase(),

        orderType: "Delivery",

        note: order.note || null,
        createdAt: order.createdAt,

        // Items
        items: (order.items || []).map((item) => ({
          name: item.name,
          image: item.image || null,
          foodType: item.foodType || null,
          portion: item.portion || null,
          quantity: item.quantity,
          price: item.unitPrice,
          total: item.totalPrice,
        })),
      };
    });


    // Step 4: Counts (🔥 ALSO FIXED)
    const totalOrders = orders.length;

    const pendingStatuses = ["placed", "confirmed", "preparing", "ready", "picked"];

    const pendingCount = orders.filter((o) =>
      pendingStatuses.includes((o.status || "placed"))
    ).length;

    const completedCount = orders.filter(
      (o) => (o.status || "placed") === "delivered"
    ).length;

    const cancelledCount = orders.filter(
      (o) => (o.status || "placed") === "cancelled"
    ).length;

    // Step 5: Partial render
    const isPartial =
      req.query.partial === "true" ||
      req.headers["x-requested-with"] === "XMLHttpRequest";

    return res.render(path.join("restaurant", "order"), {
      orders,
      totalOrders,
      pendingCount,
      completedCount,
      cancelledCount,
      _pending: pendingCount,
      user: req.user,
      ...(isPartial && { layout: false }),
    });

  } catch (error) {
    console.error("getOrder error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
    });
  }
}

export async function updateOrderStatus(req, res) {
  try {
    const orderId = req.params.id;
    const { status } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      req.session.message = "Order not found";
      return res.redirect("/owner/orders");
    }

    const currentStatus = order.orderStatus;

    // ✅ Allowed flow for OWNER (only till READY)
    const ownerFlow = ['placed', 'confirmed', 'preparing', 'ready'];

    // ❌ Restrict owner from updating after READY
    if (!ownerFlow.includes(status)) {
      req.session.message = "You cannot update status beyond READY";
      return res.redirect("/owner/orders");
    }

    // ❌ Prevent invalid jumps (skip steps)
    const flow = ['placed', 'confirmed', 'preparing', 'ready', 'picked', 'delivered'];
    const currentIndex = flow.indexOf(currentStatus);
    const nextAllowed = flow[currentIndex + 1];

    if (status !== nextAllowed && status !== 'cancelled') {
      req.session.message = "Invalid status transition";
      return res.redirect("/owner/orders");
    }

    let updateFields = { orderStatus: status };

    if (status === "confirmed") {
      updateFields.ownerStatus = "confirmed";
    }

    if (status === "cancelled") {
      updateFields.ownerStatus = "rejected";
    }

    await Order.findByIdAndUpdate(orderId, updateFields);

    req.session.message = `Order ${status} successfully`;
    return res.redirect("/owner/orders");

  } catch (err) {
    console.error(err);
    return res.status(500).send("Error updating order");
  }
}