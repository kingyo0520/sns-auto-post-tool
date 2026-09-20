/**
 * フェーズ2(Instagram投稿実行)
 * generate.ts で生成した画像がGitHub Pages等で公開URLとして参照可能になった後に実行する。
 */
import { config } from "./config.js";
import { getScheduledPosts, markPostAsPublished, markPostAsError } from "./notion.js";
import { blocksToSlides } from "./slides.js";
import { publishCarousel } from "./instagram.js";
import { notifyPublished, notifyError } from "./notify.js";

function buildCaption(hashtags: string, cta: string): string {
  return [cta, "", hashtags].filter(Boolean).join("\n");
}

async function main() {
  if (!config.publicImageBaseUrl) {
    throw new Error("PUBLIC_IMAGE_BASE_URLが未設定です(GitHub PagesのURLを指定してください)");
  }

  const posts = await getScheduledPosts();
  const targets = posts.filter((p) => p.platform === "Instagram" && p.format === "カルーセル");
  console.log(`Instagram投稿対象: ${targets.length}件`);

  for (const post of targets) {
    try {
      const slideCount = blocksToSlides(post.blocks).length;
      if (slideCount === 0) continue; // generate.ts側で既にエラー通知済み

      const imageUrls = Array.from(
        { length: slideCount },
        (_, i) => `${config.publicImageBaseUrl}/images/${post.pageId}/slide-${i + 1}.png`
      );

      const permalink = await publishCarousel(imageUrls, buildCaption(post.hashtags, post.cta));
      await markPostAsPublished(post.pageId, permalink);
      await notifyPublished({ platform: post.platform, title: post.title, url: permalink });
      console.log(`[投稿完了] ${post.title} -> ${permalink}`);
    } catch (err: any) {
      console.error(`[投稿失敗] ${post.title}:`, err.message);
      await notifyError({ platform: post.platform, title: post.title, error: err.message });
      await markPostAsError(post.pageId);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
