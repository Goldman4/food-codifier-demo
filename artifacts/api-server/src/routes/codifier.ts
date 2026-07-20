import { Router } from "express";
import { codifierData } from "../lib/data-loader";

const router = Router();

// GET /api/codifier/info
router.get("/info", (_req, res) => {
  res.json({ count: codifierData.length });
});

export default router;
