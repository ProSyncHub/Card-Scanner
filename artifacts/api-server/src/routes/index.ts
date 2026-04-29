import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth.js";
import cardsRouter from "./cards.js";
import processCardRouter from "./processCard.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(cardsRouter);
router.use(processCardRouter);

export default router;
