import { Client } from "@notionhq/client";
import { config } from "./config.js";

export const notion = new Client({ auth: config.notionApiKey });

export type Platform = "Instagram" | "X" | "note";

export interface PostRecord {
  pageId: string;
  title: string;
  platform: Platform;
  format: string;
  categories: string[];
  hashtags: string;
  cta: string;
  blocks: any[];
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * ステータス=予約済み かつ 投稿予定日<=今日 のレコードを取得する。
 * Xは無料スタックの対象外のため除外する。
 */
export async function getScheduledPosts(): Promise<PostRecord[]> {
  const response = await notion.databases.query({
    database_id: config.notionDatabaseId,
    filter: {
      and: [
        { property: "ステータス", select: { equals: "予約済み" } },
        { property: "投稿予定日", date: { on_or_before: todayISO() } },
        { property: "媒体", select: { does_not_equal: "X" } },
      ],
    },
  });

  const records: PostRecord[] = [];
  for (const page of response.results as any[]) {
    const props = page.properties;
    const blocks = await getAllBlocks(page.id);
    records.push({
      pageId: page.id,
      title: props.Name?.title?.[0]?.plain_text ?? "(無題)",
      platform: props["媒体"]?.select?.name ?? "Instagram",
      format: props["投稿形式"]?.select?.name ?? "",
      categories: (props["カテゴリ"]?.multi_select ?? []).map((o: any) => o.name),
      hashtags: props["ハッシュタグ"]?.rich_text?.[0]?.plain_text ?? "",
      cta: props["CTA/誘導先"]?.rich_text?.[0]?.plain_text ?? "",
      blocks,
    });
  }
  return records;
}

async function getAllBlocks(pageId: string): Promise<any[]> {
  const blocks: any[] = [];
  let cursor: string | undefined;
  do {
    const res = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
    });
    blocks.push(...res.results);
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);
  return blocks;
}

export async function markPostAsPublished(pageId: string, note?: string) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      ステータス: { select: { name: "投稿済み" } },
      ...(note
        ? { "CTA/誘導先": { rich_text: [{ text: { content: note } }] } }
        : {}),
    },
  });
}

export async function markPostAsError(pageId: string) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      ステータス: { select: { name: "レビュー中" } },
    },
  });
}
