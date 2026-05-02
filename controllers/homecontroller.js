import path from "path";
import Restaurant from "../model/Restaurant.js";

export async function getHome(req, res) {
  try {
    const user = req.session.user || null;

    // Get some restaurants for homepage
    const restaurants = await Restaurant.find().limit(10).sort({ createdAt: -1 });

    res.render("index", {
      user,
      restaurants
    });

  } catch (err) {
    console.log(err.message);
    res.status(500).send("Server Error");
  }
}