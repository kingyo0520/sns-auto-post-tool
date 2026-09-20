import { config } from "./config.js";

async function postToDiscord(content: string) {
  if (!config.discordWebhookUrl) {
    console.warn("DISCORD_WEBHOOK_URL未設定のため通知をスキップしました");
    return;
  }
  // Discordの1メッセージ2000文字制限に合わせて分割
  const chunks = content.match(/[\s\S]{1,1900}/g) ?? [content];
  for (const chunk of chunks) {
    await fetch(config.discordWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: chunk }),
    });
  }
}

export async function notifyManualPostNeeded(params: {
  platform: string;
  title: string;
  bodyText: string;
  hashtags: string;
  cta: string;
  pageUrl: string;
}) {
  const message =
    `📝 **手動投稿が必要です【${params.platform}】**\n` +
    `**${params.title}**\n\n` +
    `${params.bodyText}\n\n` +
    `${params.hashtags}\n` +
    `CTA: ${params.cta}\n\n` +
    `Notion: ${params.pageUrl}`;
  await postToDiscord(message);
}

export async function notifyPublished(params: { platform: string; title: string; url: string }) {
  await postToDiscord(`✅ **投稿完了【${params.platform}】** ${params.title}\n${params.url}`);
}

export async function notifyError(params: { platform: string; title: string; error: string }) {
  await postToDiscord(
    `🚨 **投稿エラー【${params.platform}】** ${params.title}\n\`\`\`${params.error}\`\`\``
  );
}
