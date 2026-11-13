import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.silicondynasty.game",
  appName: "SILICON DYNASTY",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
