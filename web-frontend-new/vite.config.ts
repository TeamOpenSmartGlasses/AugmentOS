import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "https://vpmkebx0cl.execute-api.us-east-2.amazonaws.com/",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  plugins: [react()],
});
