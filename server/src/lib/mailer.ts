import nodemailer, { Transporter } from "nodemailer";
import { mailConfig } from "../config/env.js";
import { logger } from "./logger.js";

let transporter: Transporter | null = null;
let transporterKey = "";

/**
 * 阿里云邮件推送（DirectMail）SMTP 发信封装。
 *
 * 前置条件（需在阿里云控制台完成，代码无法代为操作）：
 * 1. 开通「邮件推送」产品，完成发信域名验证（DNS 添加 SPF/DKIM/MX 记录）。
 * 2. 在「发信地址」中创建发信地址（如 no-reply@yourdomain.com），
 *    并单独设置一个「SMTP 密码」（不是账号登录密码）。
 * 3. 把发信地址、SMTP 密码、SMTP host 写入 .env（见 .env.example）。
 *
 * 常见 SMTP host：
 * - 国内区域：smtpdm.aliyun.com（端口 25/80/465/587，465/587 建议用 SSL）
 * - 国际区域（新加坡等）：smtpdm.ap-southeast-1.aliyuncs.com
 */
const getTransporter = (): Transporter => {
  const key = `${mailConfig.host}:${mailConfig.port}:${mailConfig.user}`;
  if (transporter && transporterKey === key) return transporter;

  transporter = nodemailer.createTransport({
    host: mailConfig.host,
    port: mailConfig.port,
    secure: mailConfig.port === 465,
    auth: {
      user: mailConfig.user,
      pass: mailConfig.pass
    }
  });
  transporterKey = key;
  return transporter;
};

export const isMailConfigured = () =>
  Boolean(mailConfig.host && mailConfig.user && mailConfig.pass);

interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendMail = async ({ to, subject, html, text }: SendMailInput) => {
  if (!isMailConfigured()) {
    // 开发环境兜底：没配置阿里云邮件推送时，把邮件内容打到日志里，方便本地联调。
    logger.warn(
      { to, subject, html },
      "Mail is not configured (DM_SMTP_HOST/DM_SMTP_USER/DM_SMTP_PASS missing) — logging instead of sending"
    );
    return { skipped: true as const };
  }

  const info = await getTransporter().sendMail({
    from: `"${mailConfig.fromName}" <${mailConfig.user}>`,
    to,
    subject,
    html,
    text
  });

  logger.info({ to, subject, messageId: info.messageId }, "Mail sent");
  return { skipped: false as const, messageId: info.messageId };
};

export const sendVerificationEmail = async (to: string, token: string) => {
  const verifyUrl = `${mailConfig.appBaseUrl}/verify-email?token=${encodeURIComponent(token)}`;

  return sendMail({
    to,
    subject: "请验证你的 Circulink 学生邮箱",
    html: `
      <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>验证你的邮箱</h2>
        <p>感谢注册 Circulink。请点击下面的按钮完成邮箱验证（24 小时内有效）：</p>
        <p style="margin: 24px 0;">
          <a href="${verifyUrl}"
             style="background:#16a34a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">
            验证邮箱
          </a>
        </p>
        <p>或复制以下链接到浏览器打开：<br/>${verifyUrl}</p>
        <p style="color:#888;font-size:12px;">如果这不是你本人的操作，请忽略此邮件。</p>
      </div>
    `,
    text: `请打开以下链接验证你的邮箱（24 小时内有效）：${verifyUrl}`
  });
};

export const sendPasswordResetEmail = async (to: string, token: string) => {
  const resetUrl = `${mailConfig.appBaseUrl}/reset-password?token=${encodeURIComponent(token)}`;

  return sendMail({
    to,
    subject: "重置你的 Circulink 密码",
    html: `
      <div style="font-family: -apple-system, Segoe UI, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2>重置密码</h2>
        <p>我们收到了重置密码的请求（1 小时内有效）：</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}"
             style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">
            重置密码
          </a>
        </p>
        <p>或复制以下链接到浏览器打开：<br/>${resetUrl}</p>
        <p style="color:#888;font-size:12px;">如果这不是你本人的操作，请忽略此邮件。</p>
      </div>
    `,
    text: `请打开以下链接重置密码（1 小时内有效）：${resetUrl}`
  });
};
