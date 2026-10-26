import {Router} from "express";
import {getHome} from "../controllers/homecontroller.js";

export const homeRouter = Router();
homeRouter.get("/", (req, res, next) => {
    const user = req.session?.user;

    // No active session: show public homepage
    if (!user) {
        return getHome(req, res, next);
    }

    // Active session: redirect according to role
    switch (user.role) {
        case "customer":
            return res.redirect("/customer/customer-dashboard");

        case "restaurantOwner":
            return res.redirect("/owner/owner-dashboard");

        case "deliveryAgent":
            return res.redirect("/delievery/delievery-dashboard");

        default:
            return getHome(req, res, next);
    }
});