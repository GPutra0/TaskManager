import jwt from "jsonwebtoken";
import { config } from "dotenv";
config();

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-ganti-di-produksi-2026";

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Token diperlukan" });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Token tidak valid" });
    req.user = user;
    next();
  });
};
