import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "./db.js";
import { requireAdmin, requireAuth, signUserToken } from "./auth.js";

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/register", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    company: z.string().optional(),
    phone: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload." });

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return res.status(409).json({ error: "Email already exists." });

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      passwordHash,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      company: parsed.data.company,
      phone: parsed.data.phone,
      status: "approved",
    },
  });

  const token = signUserToken(user);
  return res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
      status: user.status,
      isAdmin: user.isAdmin,
      canOrderPieces: user.canOrderPieces,
    },
  });
});

app.post("/api/auth/login", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload." });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) return res.status(401).json({ error: "Invalid credentials." });

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials." });

  const token = signUserToken(user);
  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      isAdmin: user.isAdmin,
      canOrderPieces: user.canOrderPieces,
    },
  });
});

app.get("/api/products", async (req, res) => {
  const code = typeof req.query.code === "string" ? req.query.code : undefined;
  const products = await prisma.product.findMany({
    where: code ? { code } : undefined,
    orderBy: [{ code: "asc" }, { size: "asc" }],
  });
  res.json({ products });
});

app.post("/api/orders", requireAuth, async (req, res) => {
  const schema = z.object({
    deliveryZip: z.string().optional(),
    notes: z.string().optional(),
    items: z
      .array(
        z.object({
          code: z.string().min(1),
          description: z.string().min(1),
          size: z.string().min(1),
          quantity: z.number().int().positive(),
          unitPrice: z.number().nonnegative(),
        })
      )
      .min(1),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload." });

  const subtotal = parsed.data.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const orderNumber = `APBS-${Date.now()}`;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: Number(req.user.sub),
      status: "pending",
      subtotal,
      notes: parsed.data.notes,
      deliveryZip: parsed.data.deliveryZip,
      items: {
        create: parsed.data.items,
      },
    },
    include: { items: true },
  });

  res.status(201).json({ order });
});

app.get("/api/orders/me", requireAuth, async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: Number(req.user.sub) },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ orders });
});

app.get("/api/admin/summary", requireAuth, requireAdmin, async (_req, res) => {
  const [users, products, orders] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.order.count(),
  ]);
  res.json({ users, products, orders });
});

app.get("/api/admin/users", requireAuth, requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      company: true,
      phone: true,
      status: true,
      isAdmin: true,
      canOrderPieces: true,
      createdAt: true,
    },
  });
  res.json({ users });
});

app.patch("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid user id." });
  const schema = z.object({
    status: z.enum(["approved", "pending", "disabled"]).optional(),
    isAdmin: z.boolean().optional(),
    canOrderPieces: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload." });

  const user = await prisma.user.update({
    where: { id },
    data: parsed.data,
  });
  res.json({ user });
});

app.get("/api/admin/products", requireAuth, requireAdmin, async (_req, res) => {
  const products = await prisma.product.findMany({
    orderBy: [{ code: "asc" }, { size: "asc" }],
  });
  res.json({ products });
});

app.post("/api/admin/products", requireAuth, requireAdmin, async (req, res) => {
  const schema = z.object({
    code: z.string().min(1),
    description: z.string().min(1),
    size: z.string().min(1),
    pack: z.number().int().nonnegative(),
    qty: z.number().int().nonnegative(),
    price: z.number().nonnegative(),
    image: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload." });

  const product = await prisma.product.create({ data: parsed.data });
  res.status(201).json({ product });
});

app.patch("/api/admin/products/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid product id." });
  const schema = z.object({
    code: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    size: z.string().min(1).optional(),
    pack: z.number().int().nonnegative().optional(),
    qty: z.number().int().nonnegative().optional(),
    price: z.number().nonnegative().optional(),
    image: z.string().nullable().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload." });
  const product = await prisma.product.update({ where: { id }, data: parsed.data });
  res.json({ product });
});

app.delete("/api/admin/products/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid product id." });
  await prisma.product.delete({ where: { id } });
  res.status(204).end();
});

app.get("/api/admin/orders", requireAuth, requireAdmin, async (_req, res) => {
  const orders = await prisma.order.findMany({
    include: {
      items: true,
      user: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json({ orders });
});

app.patch("/api/admin/orders/:id", requireAuth, requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid order id." });
  const schema = z.object({
    status: z.enum(["pending", "confirmed", "delivered", "cancelled"]),
    notes: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid payload." });
  const order = await prisma.order.update({ where: { id }, data: parsed.data });
  res.json({ order });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Server error." });
});

app.listen(port, () => {
  console.log(`APBS test backend running on http://localhost:${port}`);
});
