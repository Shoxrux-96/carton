CREATE TABLE "attendance" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"date" date NOT NULL,
	"status" text DEFAULT 'present' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_employee_date" UNIQUE("employee_id","date")
);
--> statement-breakpoint
CREATE TABLE "calculations" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" text DEFAULT '' NOT NULL,
	"box_name" text DEFAULT '' NOT NULL,
	"box_width" numeric(10, 2) DEFAULT '0' NOT NULL,
	"box_height" numeric(10, 2) DEFAULT '0' NOT NULL,
	"box_length" numeric(10, 2) DEFAULT '0' NOT NULL,
	"l1_weight" numeric(10, 4) DEFAULT '0' NOT NULL,
	"l1_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"l2_weight" numeric(10, 4) DEFAULT '0' NOT NULL,
	"l2_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"l3_weight" numeric(10, 4) DEFAULT '0' NOT NULL,
	"l3_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"blank_len" numeric(10, 2) DEFAULT '0' NOT NULL,
	"blank_w" numeric(10, 2) DEFAULT '0' NOT NULL,
	"net_area_m2" numeric(10, 4) DEFAULT '0' NOT NULL,
	"total_weight" numeric(10, 4) DEFAULT '0' NOT NULL,
	"total_paper_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"sale_price" numeric(12, 2) DEFAULT '0' NOT NULL,
	"coefficient" numeric(6, 2) DEFAULT '1.50' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"address" text,
	"type" text DEFAULT 'lead' NOT NULL,
	"source" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"position" text,
	"salary" numeric(12, 2) DEFAULT '0',
	"hire_date" date,
	"status" text DEFAULT 'active' NOT NULL,
	"notes" text,
	"login_phone" text,
	"login_password" text,
	"face_descriptor" text,
	"face_image" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" serial PRIMARY KEY NOT NULL,
	"warehouse_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_warehouse_product" UNIQUE("warehouse_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"product_id" integer,
	"quantity" integer DEFAULT 0 NOT NULL,
	"total_sum" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"delivery_status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"order_date" timestamp DEFAULT now() NOT NULL,
	"delivery_date" timestamp,
	"order_type" text,
	"order_code" text,
	"supplier" text,
	"material_name" text,
	"items" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"warehouse_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"total_sum" numeric(14, 2) DEFAULT '0' NOT NULL,
	"production_date" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(12, 2) NOT NULL,
	"image" text,
	"length" numeric(10, 2),
	"width" numeric(10, 2),
	"height" numeric(10, 2),
	"material" text,
	"color" text,
	"client_logo" text,
	"category" text,
	"materials" text,
	"is_published" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"warehouse_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"sold_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "social_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"platform" text NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "social_links_platform_unique" UNIQUE("platform")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"assignee_id" integer,
	"product_id" integer,
	"material_name" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"date" date DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text DEFAULT 'income' NOT NULL,
	"category" text,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"description" text,
	"date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'employee' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waybill_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"waybill_id" integer NOT NULL,
	"name" text,
	"format" text,
	"unit" text,
	"quantity" numeric(10, 2) DEFAULT '0' NOT NULL,
	"price" numeric(12, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waybills" (
	"id" serial PRIMARY KEY NOT NULL,
	"doc_number" integer NOT NULL,
	"date" date NOT NULL,
	"sender_company" text,
	"sender_phone" text,
	"receiver_company" text,
	"receiver_phone" text,
	"vehicle" text,
	"total_sum" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production" ADD CONSTRAINT "production_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production" ADD CONSTRAINT "production_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_id_employees_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waybill_items" ADD CONSTRAINT "waybill_items_waybill_id_waybills_id_fk" FOREIGN KEY ("waybill_id") REFERENCES "public"."waybills"("id") ON DELETE cascade ON UPDATE no action;