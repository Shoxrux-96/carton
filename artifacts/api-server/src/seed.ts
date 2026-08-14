/**
 * Hodimlar va admin loginlarini yaratish.
 * Ishga tushirish: DATABASE_URL=... pnpm --filter @workspace/api-server run seed
 */
import { db, employeesTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const ADMIN = {
  phone: "998995054004",
  password: "admin12345",
  role: "admin" as const,
};

const EMPLOYEES = [
  {
    name: "Dilshod Karimov",
    phone: "+998 90 111 10 01",
    position: "Boshqaruvchi",
    salary: "5000000",
    loginPhone: "998901111001",
    loginPassword: "hodim12345",
    role: "employee" as const,
  },
  {
    name: "Aziza Rahimova",
    phone: "+998 90 111 10 02",
    position: "Buxgalter",
    salary: "4500000",
    loginPhone: "998901111002",
    loginPassword: "hodim22345",
    role: "employee" as const,
  },
  {
    name: "Javohir Toshmatov",
    phone: "+998 90 111 10 03",
    position: "Ishchi",
    salary: "3500000",
    loginPhone: "998901111003",
    loginPassword: "hodim32345",
    role: "employee" as const,
  },
  {
    name: "Sherzod Mirzayev",
    phone: "+998 90 111 10 04",
    position: "Haydovchi (dastavkachi)",
    salary: "4000000",
    loginPhone: "998901111004",
    loginPassword: "hodim42345",
    role: "employee" as const,
  },
  {
    name: "Gulnoza Yusupova",
    phone: "+998 90 111 10 05",
    position: "Oshpaz",
    salary: "3200000",
    loginPhone: "998901111005",
    loginPassword: "hodim52345",
    role: "employee" as const,
  },
  {
    name: "Rustam Ergashev",
    phone: "+998 90 111 10 06",
    position: "Qorovul",
    salary: "3000000",
    loginPhone: "998901111006",
    loginPassword: "hodim62345",
    role: "employee" as const,
  },
];

async function upsertUser(phone: string, password: string, role: string) {
  const existing = await db.select().from(usersTable).where(eq(usersTable.phone, phone)).limit(1);
  if (existing.length > 0) {
    await db.update(usersTable).set({ password, role }).where(eq(usersTable.phone, phone));
    return existing[0].id;
  }
  const [user] = await db.insert(usersTable).values({ phone, password, role }).returning();
  return user.id;
}

async function upsertEmployee(data: (typeof EMPLOYEES)[number]) {
  const cleanLogin = data.loginPhone.replace(/[\s\+\-\(\)]/g, "");
  const existing = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.loginPhone, cleanLogin))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(employeesTable)
      .set({
        name: data.name,
        phone: data.phone,
        position: data.position,
        salary: data.salary,
        loginPassword: data.loginPassword,
        status: "active",
      })
      .where(eq(employeesTable.id, existing[0].id));
    return existing[0].id;
  }

  const [employee] = await db
    .insert(employeesTable)
    .values({
      name: data.name,
      phone: data.phone,
      position: data.position,
      salary: data.salary,
      hireDate: new Date().toISOString().split("T")[0],
      status: "active",
      loginPhone: cleanLogin,
      loginPassword: data.loginPassword,
    })
    .returning();

  return employee.id;
}

async function main() {
  console.log("Admin va hodimlar yaratilmoqda...\n");

  await upsertUser(ADMIN.phone, ADMIN.password, ADMIN.role);
  console.log(`✅ Admin: ${ADMIN.phone} / ${ADMIN.password}`);

  for (const emp of EMPLOYEES) {
    await upsertEmployee(emp);
    await upsertUser(emp.loginPhone, emp.loginPassword, emp.role);
    console.log(`✅ ${emp.name} (${emp.position}): ${emp.loginPhone} / ${emp.loginPassword}`);
  }

  console.log("\n---");
  console.log("Mobil ilova (Admin):");
  console.log(`  Login: ${ADMIN.phone}`);
  console.log(`  Parol: ${ADMIN.password}`);
  console.log("\nAdmin web/mobilga kiradi, hodimlar uchun 3×4 rasm yuklang.");
  console.log("Dashboard → Hodimlar → Tahrirlash → Rasm yuklash");
  console.log("Rasm yuklangandan keyin Face ID davomat ishlaydi.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
