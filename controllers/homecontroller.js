import path from "path";
import Restaurant from "../model/Restaurant.js";

export async function getHome(req, res) {
    try {
        const restaurants = await Restaurant.find()
            .sort({ createdAt: -1 })
            .limit(10);

        return res.render("index", {
            user: req.session?.user || null,
            restaurants
        });
    } catch (err) {
        console.error("Home controller error:", err);
        return res.status(500).send("Server Error");
    }
}