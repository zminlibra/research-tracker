// Cloudflare OpenNext 适配器配置
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // 禁用 S3 上传适配器（本项目不需要文件上传）
  dangerousDisableS3Upload: true,
});
