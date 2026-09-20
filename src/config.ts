import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`環境変数 ${name} が設定されていません`);
  }
  return value;
}

export const config = {
  notionApiKey: required("NOTION_API_KEY"),
  notionDatabaseId: required("NOTION_DATABASE_ID"),
  igBusinessAccountId: process.env.IG_BUSINESS_ACCOUNT_ID ?? "",
  igAccessToken: process.env.IG_ACCESS_TOKEN ?? "",
  publicImageBaseUrl: process.env.PUBLIC_IMAGE_BASE_URL ?? "",
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL ?? "",
};
