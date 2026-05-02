import User from "../model/user.js"
import bcrypt from "bcrypt";

export function getLogin(req, res) {
  let msg = req.session.message;
  // req.session.message = "";
  res.render("Login", { msg })
}
export function getSignup(req, res) {
  let msg = req.session.message;
  req.session.message = "";
  res.render("Signup", { msg })
}
export async function postSignup(req, res) {
  try {
    const { name, email, password, street,city,state,pincode, phone, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.session.message = "Email already registered";
      return res.redirect("/auth/login");
    }
    const hashedpassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedpassword,
      role,
      address: {
        street,
        city,
        state,
        pincode
      },
      phone
    })
    await newUser.save();
    req.session.message = "Signup Successfull";
    res.redirect("/auth/login");
  } catch (error) {
    console.log("Signup Error:", error);
    req.session.message = "Something went wrong";
    res.redirect("/auth/signup");
  }
}

export async function postLogin(req, res) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      req.session.message = "User not found";
      return res.redirect("/auth/login");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.session.message = "Incorrect password";
      return res.redirect("/auth/login");
    }

    // ✅ FIXED SESSION STRUCTURE
    req.session.user = {
      _id: user._id,          // 🔥 always use _id
      name: user.name,
      email: user.email,
      role: user.role
    };

    console.log("✅ Logged in user:", req.session.user);

    // ✅ ROLE BASED REDIRECT
    if (user.role === "restaurantOwner") {
      return res.redirect("/owner/owner-dashboard");
    } else if (user.role === "deliveryAgent") {
      return res.redirect("/delievery/delievery-dashboard");
    } else {
      return res.redirect("/customer/customer-dashboard");
    }

  } catch (err) {
    console.error(err);
    res.send(err);
  }
}

export function handleLogout(req, res) {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/auth/login")
  })
}