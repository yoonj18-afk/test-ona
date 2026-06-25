import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 8080,
    // Allow Ona's forwarded preview hosts (e.g. 8080--<env-id>.<region>.flexdev.roche.com)
    allowedHosts: [".flexdev.roche.com"],
  },
  preview: {
    host: "0.0.0.0",
    port: 8080,
    allowedHosts: [".flexdev.roche.com"],
  },
});
