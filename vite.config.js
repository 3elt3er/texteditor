import { defineConfig } from "vite";

export default defineConfig({
    server: {
        port: 5173, // Vite будет работать на этом порту
        strictPort: true
    }
});