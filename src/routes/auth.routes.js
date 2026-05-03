import { Router } from "express";
import {
  signin,
  callback,
  me,
  logout,
} from "../controllers/auth.controllers.js";

const router = Router();

router.get("/signin", signin);
router.post("/callback", callback);
router.get("/me", me);
router.post("/logout", logout);

export default router;
