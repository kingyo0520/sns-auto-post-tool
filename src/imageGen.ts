import { chromium } from "playwright";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";

const TEMPLATE_PATH = path.join(process.cwd(), "src/templates/slide.html");
const OUTPUT_DIR = path.join(process.cwd(), "public/images");

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * スライドテキストの配列を1080x1350のPNG画像群にレンダリングする。
 * 戻り値はローカルファイルパスの配列(スライド順)。
 */
export async function renderSlidesToImages(
  postId: string,
  slides: string[],
  footer = "@your_account"
): Promise<string[]> {
  const template = readFileSync(TEMPLATE_PATH, "utf-8");
  const dir = path.join(OUTPUT_DIR, postId);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });

  const outputPaths: string[] = [];
  for (let i = 0; i < slides.length; i++) {
    const html = template
      .replace("{{INDEX}}", String(i + 1))
      .replace("{{TOTAL}}", String(slides.length))
      .replace("{{TEXT}}", escapeHtml(slides[i]))
      .replace("{{FOOTER}}", escapeHtml(footer));

    await page.setContent(html, { waitUntil: "load" });
    const filePath = path.join(dir, `slide-${i + 1}.png`);
    await page.screenshot({ path: filePath });
    outputPaths.push(filePath);
  }

  await browser.close();
  return outputPaths;
}
