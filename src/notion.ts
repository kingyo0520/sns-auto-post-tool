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

/**
 * ステータス=予約済み かつ 投稿予定日(日時)<=実行時刻 のレコードを取得する。
 * 1日2回(朝7時/夕方17時)実行される運用のため、日付だけでなく時刻まで見て
 * 「まだ来ていない時間帯の予約」を誤って先取りしないようにする。
 * 予約時は「投稿予定日」に時刻まで設定すること(例:朝の投稿は07:00、夕方は17:00)。
 * Xは無料スタックの対象外のため除外する。
 */
export async function getScheduledPosts(): Promise<PostRecord[]> {
  const response = await notion.databases.query({
    database_id: config.notionDatabaseId,
    filter: {
      and: [
        { property: "ステータス", select: { equals: "予約済み" } },
        { property: "投稿予定日", date: { on_or_before: new Date().toISOString() } },
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

/**
 * Notion「SNS自動投稿ツール 運用設定」DBのチェックボックスを見て、一時停止中かどうかを判定する。
 * ユーザーがコードやGitHubを触らずに、Notion上のチェック一つで止められるようにするための仕組み。
 */
export async function isPostingPaused(): Promise<boolean> {
  const response = await notion.databases.query({
    database_id: config.notionSettingsDatabaseId,
    page_size: 1,
  });
  const page = response.results[0] as any;
  return page?.properties?.["投稿を一時停止する"]?.checkbox === true;
}

export async function markPostAsError(pageId: string) {
  await notion.pages.update({
    page_id: pageId,
    properties: {
      ステータス: { select: { name: "レビュー中" } },
    },
  });
}
