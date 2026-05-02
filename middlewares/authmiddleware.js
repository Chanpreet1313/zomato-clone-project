export function authmiddleware(req, res, next) {
  // ✅ Check if user exists in session
  if (!req.session.user) {
    req.session.message = "Login again";
    return res.redirect("/auth/login");
  }

  // ✅ Attach full user to req
  req.user = req.session.user;
  req.userId = req.session.userId;  

  next();
}