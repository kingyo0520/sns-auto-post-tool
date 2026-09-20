/**
 * フェーズ1(画像生成・手動投稿通知)
 * - Instagramカルーセル対象:スライド画像をpublic/images配下に生成(この後CIがgh-pagesへpush)
 * - note / リール / 単発ポスト:自動投稿はせず、本文をDiscordに通知して人が仕上げる(半自動)
 *   通知後はステータスを「レビュー中」にし、重複通知を防ぐ(投稿完了後は人が「投稿済み」へ変更)
 */
import { getScheduledPosts, markPostAsError, notion } from "./notion.js";
import { blocksToSlides, blocksToPlainText } from "./slides.js";
import { renderSlidesToImages } from "./imageGen.js";
import { notifyManualPostNeeded, notifyError } from "./notify.js";

function pageUrl(pageId: string): string {
  return `https://www.notion.so/${pageId.replace(/-/g, "")}`;
}

async function markNeedsManualAction(pageId: string) {
  await notion.pages.update({
    page_id: pageId,
    properties: { ステータス: { select: { name: "レビュー中" } } },
  });
}

async function main() {
  const posts = await getScheduledPosts();
  console.log(`対象レコード: ${posts.length}件`);

  for (const post of posts) {
    try {
      if (post.platform === "Instagram" && post.format === "カルーセル") {
        const slides = blocksToSlides(post.blocks);
        if (slides.length === 0) {
          throw new Error("スライドテキストが見つかりません(見出しに「スライド構成」等が必要)");
        }
        await renderSlidesToImages(post.pageId, slides);
        console.log(`[生成完了] ${post.title}(${slides.length}スライド)`);
        // ステータスはpublish.tsが投稿成功後に更新するため、ここでは変更しない
        continue;
      }

      // リール・単発ポスト・note は当面「半自動」:ページ全文を通知し人が仕上げる
      // (Instagram単発ポストのページにX版の文言が混在する場合があるが、通知内容の余剰として許容する)
      const bodyText = blocksToPlainText(post.blocks);

      await notifyManualPostNeeded({
        platform: post.platform,
        title: post.title,
        bodyText: bodyText || "(本文取得できず。Notionページを直接確認してください)",
        hashtags: post.hashtags,
        cta: post.cta,
        pageUrl: pageUrl(post.pageId),
      });
      await markNeedsManualAction(post.pageId);
      console.log(`[手動対応通知] ${post.title}`);
    } catch (err: any) {
      console.error(`[エラー] ${post.title}:`, err.message);
      await notifyError({ platform: post.platform, title: post.title, error: err.message });
      await markPostAsError(post.pageId);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
