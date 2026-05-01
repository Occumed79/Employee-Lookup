import { Router, type IRouter } from "express";
import healthRouter from "./health";
import searchRouter from "./search";
import bulkRouter from "./bulk";

const router: IRouter = Router();

router.use(healthRouter);
router.use(searchRouter);
router.use(bulkRouter);

export default router;
