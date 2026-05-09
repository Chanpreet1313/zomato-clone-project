import {Router} from "express";
import {customerDashboard,searchRestaurants,getMenu,getCart,postCart,placeOrder, getOrder,updateCart,removeCartItem,getProfile,updateProfile,changePassword } from "../controllers/customercontroller.js";

export const customerRouter = Router();
customerRouter.get("/customer-dashboard",customerDashboard);
customerRouter.get("/search",searchRestaurants);
customerRouter.get("/menu/:restaurantId",getMenu);
customerRouter.get("/cart",getCart);
customerRouter.post("/cart/add", postCart);
customerRouter.post("/order/place",placeOrder);
customerRouter.get("/my-order",getOrder);
customerRouter.post('/cart/update', updateCart);
customerRouter.post('/cart/remove', removeCartItem);
customerRouter.get("/profile",getProfile);
customerRouter.post("/profile/update",updateProfile);
customerRouter.post("/profile/change-password",changePassword);
