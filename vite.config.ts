import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // This loads the .env.local file
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    base: './', 
    define: {
      // FIX: We map "process.env.API_KEY" (what the app wants) 
      // to "env.GEMINI_API_KEY" (what you have in your file)
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY) 
    }
  }
})