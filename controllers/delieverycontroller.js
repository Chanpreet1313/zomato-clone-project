import Order from "../model/order.js";
import path from "path";
import mongoose from "mongoose";
import User from "../model/user.js";


/* ───────────────────────────────────────────── */
/* DELIVERY DASHBOARD */
/* ───────────────────────────────────────────── */
export async function delieveryDashboard(req, res) {
    try {
        const user = req.session.user;

        if (!user) {
            return res.redirect("/auth/login");
        }

        const agent = {
            name: user.name,
            initials: user.name?.split(" ").map(w => w[0]).join("").toUpperCase(),
            isOnline: true,
            rating: user.rating || 4.5,
            totalOrders: 120,
            topPercent: 10
        };

        /* ✅ ACTIVE ORDER */
        const activeOrderData = await Order.findOne({
            deliveryAgentId: user._id, // ✅ FIXED
            orderStatus: { $in: ["accepted", "picked"] }
        })
            .populate("restaurantId")
            .populate("userId");

        let activeOrder = null;

        if (activeOrderData) {
            activeOrder = {
                orderId: activeOrderData._id,

                restaurantName:
                    activeOrderData.restaurantId?.restaurantName || "Restaurant",

                restaurantArea:
                    activeOrderData.restaurantId?.address || "N/A",

                status: activeOrderData.orderStatus,
                statusLabel: activeOrderData.orderStatus,

                customer: {
                    name: activeOrderData.userId?.name || "Customer",
                    address: activeOrderData.userId?.address || "N/A",
                    phone: activeOrderData.userId?.phone || "N/A",
                    initials: activeOrderData.userId?.name?.[0] || "C"
                },

                /* ✅ IMPROVED TIMELINE */
                timeline: [
                    { label: "Order placed", state: "done" },

                    { label: "Preparing", state: "done" },

                    {
                        label: "Ready",
                        state: activeOrderData.orderStatus === "accepted" ? "active" : "done"
                    },

                    {
                        label: "Out for delivery",
                        state: activeOrderData.orderStatus === "picked" ? "active" : "wait"
                    }
                ]
            };
        }

        /* ✅ ORDER QUEUE */
        const queueOrders = await Order.find({
            orderStatus: "ready",
            deliveryAgentId: null
        })
            .populate("restaurantId")
            .populate("userId");

        const queue = queueOrders.map(order => ({
            _id: order._id,

            restaurantName:
                order.restaurantId?.restaurantName || "Restaurant",

            itemCount: order.items?.length || 1,

            distance: order.distance || "N/A",

            earning: order.grandTotal
                ? Math.round(order.grandTotal * 0.1)
                : (order.deliveryCharge || 40),

            eta: order.estimatedTime || 20,

            icon: order.items?.[0]?.name
                ? order.items[0].name[0]
                : "🍽️"
        }));

        /* ✅ TODAY STATS */
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const totalDeliveredOrders = await Order.countDocuments({
            deliveryAgentId: user._id,
            orderStatus: "delivered"
        });

        const earningsAgg = await Order.aggregate([
            {
                $match: {
                    deliveryAgentId: user._id,
                    orderStatus: "delivered",
                    updatedAt: { $gte: today }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$deliveryCharge" }
                }
            }
        ]);

        const stats = {
            totalDeliveredOrders,
            ordersVsYesterday: 0,
            todayEarnings: earningsAgg[0]?.total || 0,
            earningsVsAvg: 0,
            avgDeliveryTime: 25,
            targetTime: 30
        };

        /* ✅ WEEKLY EARNINGS */
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);

        const weeklyAgg = await Order.aggregate([
            {
                $match: {
                    deliveryAgentId: user._id,
                    orderStatus: "delivered",
                    updatedAt: { $gte: weekStart }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$deliveryCharge" },
                    deliveries: { $sum: 1 }
                }
            }
        ]);

        const earnings = {
            weekTotal: weeklyAgg[0]?.total || 0,
            weekGoal: 3000,
            goalPercent: Math.min(((weeklyAgg[0]?.total || 0) / 3000) * 100, 100),
            basePay: (weeklyAgg[0]?.total || 0) * 0.7,
            tips: 200,
            incentives: 300,
            weekDeliveries: weeklyAgg[0]?.deliveries || 0
        };

        return res.render(
            path.join("delievery", "delieverydashboard"),
            {
                queue,
                activeOrder,
                agent,
                user,
                stats,
                earnings,
                currentPage: "dashboard"
            }
        );

    } catch (err) {
        console.error(err);
        res.status(500).send("Server Error");
    }
}

/* ───────────────────────────────────────────── */
/* ACCEPT ORDER */
/* ───────────────────────────────────────────── */
export async function acceptOrder(req, res) {
    try {
        const user = req.session.user;
        const orderId = req.params.id;

        if (!user) {
            return res.json({ success: false });
        }

        const order = await Order.findById(orderId);

        if (!order) {
            return res.json({ success: false, message: "Order not found" });
        }

        /* ✅ ASSIGN AGENT */
        order.deliveryAgentId = user._id;

        /* ✅ SAVE SNAPSHOT */
        order.deliveryAgentSnapshot = {
            name: user.name,
            phone: user.phone,
            rating: user.rating || 4.5
        };

        order.orderStatus = "accepted";

        await order.save();

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.json({ success: false });
    }
}

/* ───────────────────────────────────────────── */
/* REJECT ORDER */
/* ───────────────────────────────────────────── */
export async function rejectOrder(req, res) {
    try {
        const orderId = req.params.id;

        await Order.findByIdAndUpdate(orderId, {
            orderStatus: "ready"
        });

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.json({ success: false });
    }
}

/* ───────────────────────────────────────────── */
/* DELIVER ORDER */
/* ───────────────────────────────────────────── */
export async function delieverOrder(req, res) {
    try {
        const orderId = req.params.id;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.json({ success: false });
        }

        order.orderStatus = "delivered";

        await order.save();

        res.json({
            success: true,
            earning: order.deliveryCharge || 40,
            newTodayEarnings: order.deliveryCharge || 40
        });

    } catch (err) {
        console.error(err);
        res.json({ success: false });
    }
}

export async function pickupOrder(req, res) {
    try {
        const orderId = req.params.id;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.json({ success: false });
        }

        // ✅ Update status to picked
        order.orderStatus = "picked";

        await order.save();

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.json({ success: false });
    }
}

export async function getOrderQueue(req, res) {
    try {

        const sessionUser = req.session.user;        
        const user = {
    ...sessionUser,
    initials: sessionUser.name
        ? sessionUser.name.split(" ").map(n => n[0]).join("").toUpperCase()
        : "U"
};

        if (!user) {
            return res.redirect("/auth/login");
        }

        const activeOrderData = await Order.findOne({
    deliveryAgentId: user._id,
    orderStatus: { $in: ["accepted", "picked"] }
})
.populate("restaurantId")
.populate("userId");

let activeOrder = null;

if (activeOrderData) {
    activeOrder = {
        _id: activeOrderData._id, // ✅ IMPORTANT (use real ID)

        id: activeOrderData._id.toString().slice(-6).toUpperCase(),

        restaurant: activeOrderData.restaurantId?.restaurantName || "Restaurant",

        customerName: activeOrderData.userId?.name || "Customer",

        deliveryAddress: activeOrderData.userId?.address || "Address not provided",

        items: activeOrderData.items.map(i => ({
            name: i.name,
            qty: i.quantity || 1
        })),

        earnings: activeOrderData.grandTotal
            ? Math.round(activeOrderData.grandTotal * 0.1)
            : 40,

        orderValue: activeOrderData.grandTotal || 0,

        status: activeOrderData.orderStatus
    };
}

        // 1. Fetch Pending Queue
        const queueOrders = await Order.find({
            orderStatus: "ready",
            deliveryAgentId: null
        }).populate("restaurantId").populate("userId");

        const queue = queueOrders.map(order => ({
    id: order._id.toString().slice(-6).toUpperCase(),
    restaurant: order.restaurantId?.restaurantName || "Restaurant",
    customerName: order.userId?.name || "Customer",
    deliveryAddress: order.userId?.address || "Address not provided",

    items: order.items.map(i => ({
        name: i.name,
        qty: i.quantity || 1
    })),

    earnings: order.grandTotal
        ? Math.round(order.grandTotal * 0.1)
        : 40,

    orderValue: order.grandTotal || 0,
    distance: order.distance || "N/A",
    estTime: order.estimatedTime || 20
}));

        // 2. Fetch Delivered Orders (Crucial: Population happens here)
        const deliveredOrdersData = await Order.find({
            deliveryAgentId: user._id,
            orderStatus: "delivered"
        }).populate("userId").populate("restaurantId");

        const deliveredOrders = deliveredOrdersData.map(order => {
    const deliveredDate = new Date(order.updatedAt);

    return {
        id: order._id.toString().slice(-6).toUpperCase(),

        customerName: order.userId?.name || "Customer",
        deliveryAddress: order.userId?.address || "Address not provided",
        restaurant: order.restaurantId?.restaurantName || "Restaurant",

        items: order.items.map(i => ({
            name: i.name,
            qty: i.quantity || 1
        })),

        earnings: order.grandTotal
            ? Math.round(order.grandTotal * 0.1)
            : 40,

        orderValue: order.grandTotal || 0,
        timeTaken: order.estimatedTime || 20,

        // 👇 UI display
        deliveredAt: deliveredDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        }),

        // 👇 FILTERING (IMPORTANT)
        deliveredAtISO: deliveredDate.getTime(),  // ✅ FIXED

        tip: 0
    };
});
        // 3. Stats & Earnings Calculations
       const todayEarningsValue = deliveredOrders.reduce(
    (acc, curr) => acc + curr.earnings,
    0
);
        const weeklyGoal = 5000;

        return res.render(path.join("delievery", "orderQueue"), {
            deliveredOrders,
            activeOrder,
            pendingOrders: queue,
            queue,
            page: "orderQueue", // Keep this consistent for the sidebar 'active' class
            user,
            stats: {
                todayOrders: deliveredOrders.length,
                todayEarnings: todayEarningsValue,
                todayOrdersDiff: 0,
                todayEarningsDiff: 0
            },
            earnings: {
                thisWeek: todayEarningsValue,
                weeklyGoal: weeklyGoal,
                goalPercent: Math.min(Math.round((todayEarningsValue / weeklyGoal) * 100), 100)
            },
            summary: {
                accepted: deliveredOrders.length,
                delivered: deliveredOrders.length,
                cancelled: 0,
                rating: 4.8
            }
        });

    } catch (err) {
        console.error("Error in getOrderQueue:", err);
        return res.status(500).send("Server Error");
    }
}



export async function getOwnerProfile(req, res) {
    try {
        const userId = req.session.user?.id;

        if (!userId) return res.redirect("/auth/login");

        const user = await User.findById(userId);

        const documents = [
            { id: "license", name: "Driving License", status: "verified", expires: "2027-05-12", icon: "🪪" },
            { id: "rc", name: "Vehicle RC", status: "pending", expires: null, icon: "🚗" },
            { id: "insurance", name: "Insurance", status: "expired", expires: "2024-02-01", icon: "📄" }
        ];

        res.render("profile", {
            user,
            documents,
            flash: req.session.flash || {}
        });

        req.session.flash = null;

    } catch (err) {
        console.log("Profile error:", err);
        res.status(500).send("Server Error");
    }
}

export async function getProfile(req, res) {
    try {
        const userSession = req.session.user;

        // 🔒 Not logged in
        if (!userSession) {
            return res.redirect("/auth/login");
        }

        const agentId = userSession.id || userSession._id;

        // 🔍 Fetch user (agent)
        const agent = await User.findById(agentId);

        if (!agent || agent.role !== "deliveryAgent") {
            return res.status(403).send("Unauthorized access");
        }

        // 🧠 Prepare data for UI
        const profileData = {
            name: agent.name,
            email: agent.email,
            phone: agent.phone,
            partnerId: agent.partnerId || agent._id.toString().slice(-6).toUpperCase(),
            isOnline: agent.isOnline || false,
            rating: agent.rating || 0,
            totalOrders: agent.totalOrders || 0,
            initials: agent.name
                ? agent.name.split(" ").map(n => n[0]).join("").toUpperCase()
                : "A"
        };

        // 🎯 Render profile page
        res.render(path.join("delievery", "profile"), {
            user: profileData,
            currentPage: "profile",
        });

    } catch (err) {
        console.error("Profile error:", err);
        res.status(500).send("Server Error");
    }
}