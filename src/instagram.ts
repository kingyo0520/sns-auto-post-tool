import { config } from "./config.js";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

async function graphPost(pathSegment: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH_BASE}/${pathSegment}`);
  const body = new URLSearchParams({ ...params, access_token: config.igAccessToken });
  const res = await fetch(url, { method: "POST", body });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Instagram Graph API error: ${JSON.stringify(json)}`);
  }
  return json;
}

async function graphGet(pathSegment: string, params: Record<string, string> = {}) {
  const url = new URL(`${GRAPH_BASE}/${pathSegment}`);
  url.search = new URLSearchParams({ ...params, access_token: config.igAccessToken }).toString();
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Instagram Graph API error: ${JSON.stringify(json)}`);
  }
  return json;
}

/** 画像1枚分のメディアコンテナを作成し creation_id を返す(カルーセルの子要素用) */
async function createImageChildContainer(imageUrl: string): Promise<string> {
  const res = await graphPost(`${config.igBusinessAccountId}/media`, {
    image_url: imageUrl,
    is_carousel_item: "true",
  });
  return res.id;
}

/** 複数画像URLからカルーセル投稿を作成・公開し、投稿のパーマリンクを返す */
export async function publishCarousel(imageUrls: string[], caption: string): Promise<string> {
  const childIds: string[] = [];
  for (const url of imageUrls) {
    childIds.push(await createImageChildContainer(url));
  }

  const containerRes = await graphPost(`${config.igBusinessAccountId}/media`, {
    media_type: "CAROUSEL",
    children: childIds.join(","),
    caption,
  });

  const publishRes = await graphPost(`${config.igBusinessAccountId}/media_publish`, {
    creation_id: containerRes.id,
  });

  const permalinkRes = await graphGet(publishRes.id, { fields: "permalink" });
  return permalinkRes.permalink as string;
}
