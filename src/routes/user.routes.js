import { Router } from "express";
import { loginUser, logoutUser, newRefreshAccessToken, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlerwares/multer.js";
import { verifyJWT } from "../middlerwares/auth.middleware.js";

const router = Router()

router.route("/register").post(upload.fields([{
    name:"avatar",
    maxCount:1
},{
    name:"coverImage",
    maxCount:1
}]),registerUser)

router.route("/login").post(loginUser)

router.route("/logout").post(verifyJWT ,logoutUser)
router.route("/refresh-token").post(newRefreshAccessToken)
export default router