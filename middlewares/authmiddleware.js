export function authmiddleware(req, res, next) {
  
  if (!req.session.user) {
    req.session.message = "Login again";
    return res.redirect("/auth/login");
  }

  
  req.user = req.session.user;
  req.userId = req.session.userId;  

  next();
}