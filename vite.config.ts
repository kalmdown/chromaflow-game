import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Honour an assigned PORT so the dev server can move off 5173 when it is
    // already taken. Nothing here is tied to a fixed port - no OAuth callback,
    // webhook or CORS origin - so any free port is fine.
    port: Number(process.env.PORT) || 5173,
  },
})
