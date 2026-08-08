import { Router, type IRouter } from "express";
import healthRouter from "./health";
import metroflowRouter from "./metroflow";

const router: IRouter = Router();

router.use(healthRouter);
router.use(metroflowRouter);

export default router;
