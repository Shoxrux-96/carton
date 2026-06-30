import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import productsRouter from "./products.js";
import warehousesRouter from "./warehouses.js";
import inventoryRouter from "./inventory.js";
import productionRouter from "./production.js";
import salesRouter from "./sales.js";
import dashboardRouter from "./dashboard.js";
import clientsRouter from "./clients.js";
import ordersRouter from "./orders.js";
import employeesRouter from "./employees.js";
import attendanceRouter from "./attendance.js";
import financeRouter from "./finance.js";
import faceRouter from "./face.js";
import publicRouter from "./public.js";
import socialLinksRouter from "./social-links.js";
import settingsRouter from "./settings.js";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});
router.use("/auth", authRouter);
router.use("/products", productsRouter);
router.use("/warehouses", warehousesRouter);
router.use("/inventory", inventoryRouter);
router.use("/production", productionRouter);
router.use("/sales", salesRouter);
router.use("/dashboard", dashboardRouter);
router.use("/clients", clientsRouter);
router.use("/orders", ordersRouter);
router.use("/employees", employeesRouter);
router.use("/attendance", attendanceRouter);
router.use("/finance", financeRouter);
router.use("/face", faceRouter);
router.use("/public", publicRouter);
router.use("/social-links", socialLinksRouter);
router.use("/settings", settingsRouter);

export default router;
