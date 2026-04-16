import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { authenticateToken } from "./middleware/auth.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "dotenv";

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-ganti-di-produksi-2026";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Helper log aktivitas
async function logActivity(userId, action, taskId = null, details = "") {
  await prisma.log.create({
    data: { userId, action, taskId, details },
  });
}

// ===================== AUTH =====================
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username & password wajib diisi" });

  const hashed = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({ data: { username, password: hashed } });
    res.status(201).json({ message: "Registrasi berhasil", userId: user.id });
  } catch (err) {
    res.status(400).json({ error: "Username sudah digunakan" });
  }
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Username atau password salah" });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ token, user: { id: user.id, username: user.username } });
});

// ===================== TASKS (protected) =====================
app.get("/api/tasks", authenticateToken, async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { createdById: req.user.id },
    orderBy: { dueDate: "asc" },
  });
  res.json(tasks);
});

app.post("/api/tasks", authenticateToken, async (req, res) => {
  const { title, description, status, dueDate } = req.body;
  if (!title) return res.status(400).json({ error: "Title wajib diisi" });

  const task = await prisma.task.create({
    data: {
      title,
      description,
      status: ["TODO", "IN_PROGRESS", "DONE"].includes(status) ? status : "TODO",
      dueDate: dueDate ? new Date(dueDate) : null,
      createdById: req.user.id,
    },
  });

  await logActivity(req.user.id, "CREATE_TASK", task.id, `Membuat task: ${title}`);
  res.status(201).json(task);
});

app.put("/api/tasks/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, description, status, dueDate } = req.body;

  const task = await prisma.task.findUnique({ where: { id: parseInt(id) } });
  if (!task || task.createdById !== req.user.id) {
    return res.status(404).json({ error: "Task tidak ditemukan" });
  }

  const updated = await prisma.task.update({
    where: { id: parseInt(id) },
    data: {
      title: title !== undefined ? title : task.title,
      description: description !== undefined ? description : task.description,
      status: status && ["TODO", "IN_PROGRESS", "DONE"].includes(status) ? status : task.status,
      dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : task.dueDate,
    },
  });

  await logActivity(req.user.id, "UPDATE_TASK", updated.id, `Mengubah task: ${updated.title}`);
  res.json(updated);
});

app.delete("/api/tasks/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const task = await prisma.task.findUnique({ where: { id: parseInt(id) } });
  if (!task || task.createdById !== req.user.id) {
    return res.status(404).json({ error: "Task tidak ditemukan" });
  }

  await prisma.task.delete({ where: { id: parseInt(id) } });
  await logActivity(req.user.id, "DELETE_TASK", parseInt(id), `Menghapus task ID: ${id}`);
  res.json({ message: "Task berhasil dihapus" });
});

// Lihat log aktivitas
app.get("/api/logs", authenticateToken, async (req, res) => {
  const logs = await prisma.log.findMany({
    where: { userId: req.user.id },
    orderBy: { timestamp: "desc" },
  });
  res.json(logs);
});

// Serve frontend SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Task Manager berjalan di http://localhost:${PORT}`);
});
