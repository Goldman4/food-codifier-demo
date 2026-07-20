import { Router, type IRouter } from "express";
import healthRouter from "./health";
import rationRouter from "./ration";
import codifierRouter from "./codifier";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/ration", rationRouter);
router.use("/codifier", codifierRouter);

export default router;
