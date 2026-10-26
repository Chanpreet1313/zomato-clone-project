export function authmiddleware(req, res, next) {
    if (!req.session.user) {
        req.session.message = "Login again";
        return res.redirect("/auth/login");
    }

    req.user = req.session.user;
    req.userId = req.session.userId;

    next();
}

// Prevent logged-in users from opening the login page
export function redirectIfAuthenticated(req, res, next) {
    if (!req.session?.user) {
        return next();
    }

    const role = req.session.user.role;

    switch (role) {
        case "customer":
            return res.redirect("/customer/customer-dashboard");

        case "restaurantOwner":
            return res.redirect("/owner/owner-dashboard");

        case "deliveryAgent":
            return res.redirect("/delievery/delievery-dashboard");

        default:
            return res.redirect("/");
    }
}
