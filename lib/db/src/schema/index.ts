import { pgTable, serial, text, integer, numeric, timestamp, date, unique, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("employee"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export const updateUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true }).partial();
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  image: text("image"),
  length: numeric("length", { precision: 10, scale: 2 }),
  width: numeric("width", { precision: 10, scale: 2 }),
  height: numeric("height", { precision: 10, scale: 2 }),
  material: text("material"),
  color: text("color"),
  clientLogo: text("client_logo"),
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;

export const warehousesTable = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWarehouseSchema = createInsertSchema(warehousesTable).omit({ id: true, createdAt: true });
export type InsertWarehouse = z.infer<typeof insertWarehouseSchema>;
export type Warehouse = typeof warehousesTable.$inferSelect;

export const inventoryTable = pgTable("inventory", {
  id: serial("id").primaryKey(),
  warehouseId: integer("warehouse_id").notNull().references(() => warehousesTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  unique("inventory_warehouse_product").on(t.warehouseId, t.productId),
]);

export type Inventory = typeof inventoryTable.$inferSelect;

export const productionTable = pgTable("production", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  warehouseId: integer("warehouse_id").notNull().references(() => warehousesTable.id),
  quantity: integer("quantity").notNull(),
  totalSum: numeric("total_sum", { precision: 14, scale: 2 }).notNull().default("0"),
  productionDate: timestamp("production_date").notNull(),
});

export type Production = typeof productionTable.$inferSelect;

export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  address: text("address"),
  type: text("type").notNull().default("lead"),
  source: text("source"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Client = typeof clientsTable.$inferSelect;

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clientsTable.id),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  quantity: integer("quantity").notNull(),
  totalSum: numeric("total_sum", { precision: 14, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("pending"),
  deliveryStatus: text("delivery_status").notNull().default("pending"),
  notes: text("notes"),
  orderDate: timestamp("order_date").notNull().defaultNow(),
  deliveryDate: timestamp("delivery_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Order = typeof ordersTable.$inferSelect;

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  position: text("position"),
  salary: numeric("salary", { precision: 12, scale: 2 }).default("0"),
  hireDate: date("hire_date"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  loginPhone: text("login_phone"),
  loginPassword: text("login_password"),
  faceDescriptor: text("face_descriptor"),
  faceImage: text("face_image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Employee = typeof employeesTable.$inferSelect;

export const attendanceTable = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  status: text("status").notNull().default("present"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  unique("attendance_employee_date").on(t.employeeId, t.date),
]);

export type Attendance = typeof attendanceTable.$inferSelect;

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  type: text("type").notNull().default("income"),
  category: text("category"),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
  description: text("description"),
  date: date("date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Transaction = typeof transactionsTable.$inferSelect;

export const salesTable = pgTable("sales", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  warehouseId: integer("warehouse_id").notNull().references(() => warehousesTable.id),
  quantity: integer("quantity").notNull(),
  soldAt: timestamp("sold_at").defaultNow().notNull(),
});

export type Sale = typeof salesTable.$inferSelect;

export const socialLinksTable = pgTable("social_links", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull().unique(),
  url: text("url").notNull().default(""),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SocialLink = typeof socialLinksTable.$inferSelect;
