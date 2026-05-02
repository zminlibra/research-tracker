// Cloudflare OpenNext 适配器配置
import { defineCloudflareConfig, initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// 本地开发时初始化 Cloudflare 环境（让 getCloudflareContext 可用）
initOpenNextCloudflareForDev();

export default defineCloudflareConfig({});
