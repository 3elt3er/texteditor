import express from "express";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, "dist"))); // Раздача билдов Vite

app.listen(3000, () => console.log("✅ Quill-сервис запущен на http://localhost:3000"));
