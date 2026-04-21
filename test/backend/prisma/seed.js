import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  const products = [
    { code: "PIPE-SOLID", description: "ASTM D1785 SCH40 PVC", size: "2", pack: 20, qty: 2806, price: 16.2, image: "images/Sch40Solid.png" },
    { code: "PIPE-SOLID", description: "ASTM D1785 SCH40 PVC", size: "3", pack: 20, qty: 2806, price: 30.0, image: "images/Sch40Solid.png" },
    { code: "PIPE-SOLID", description: "ASTM D1785 SCH40 PVC", size: "4", pack: 20, qty: 2800, price: 54.8, image: "images/Sch40Solid.png" },
    { code: "PVC-1/4HH", description: "1/4 BEND (H x H)", size: "2", pack: 50, qty: 2700, price: 0.9, image: "images/90Elbow.png" },
    { code: "PVC-SANTEE", description: "SANITARY TEE (ALL HUB)", size: "2", pack: 35, qty: 500, price: 1.4, image: "images/SanTee.png" }
  ];

  if (products.length > 0) {
    await prisma.product.createMany({ data: products });
  }

  const passwordHash = await bcrypt.hash("Test1234!", 10);
  await prisma.user.create({
    data: {
      email: "demo@allpro.test",
      passwordHash,
      firstName: "Demo",
      lastName: "User",
      company: "All Pro Test",
      phone: "732-829-1940",
      status: "approved",
      canOrderPieces: true,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed complete.");
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
