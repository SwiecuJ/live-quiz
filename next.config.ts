import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets phones on the same Wi-Fi load dev assets (HMR, JS chunks) when you
  // open the app via the PC's LAN IP instead of localhost. Update this IP
  // if your PC's address changes (e.g. after a reboot / new DHCP lease).
  allowedDevOrigins: ["192.168.1.39"],
};

export default nextConfig;
