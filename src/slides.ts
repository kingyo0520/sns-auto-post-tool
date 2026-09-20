function plainText(richText: any[] | undefined): string {
  return (richText ?? []).map((rt) => rt.plain_text).join("");
}

/**
 * ページ本文のブロックから、カルーセル/リール用のスライドテキスト配列を抽出する。
 * "## スライド構成" 等の見出し配下にある numbered_list_item / bulleted_list_item を
 * 1スライド1テキストとして扱い、次の見出し(## ...)が来たら収集を終了する。
 */
export function blocksToSlides(blocks: any[]): string[] {
  const slides: string[] = [];
  let collecting = false;

  for (const block of blocks) {
    if (block.type === "heading_2" || block.type === "heading_3") {
      const heading = plainText(block[block.type]?.rich_text);
      collecting = /スライド|台本|構成/.test(heading);
      continue;
    }
    if (!collecting) continue;

    if (block.type === "numbered_list_item" || block.type === "bulleted_list_item") {
      const text = plainText(block[block.type]?.rich_text).trim();
      if (text) slides.push(text);
    }
  }

  return slides;
}

/**
 * ページ本文全体を、段落・見出し・リスト項目を通しテキストとして連結して返す
 * (note記事・Instagram単発ポストの手動投稿通知用)。
 */
export function blocksToPlainText(blocks: any[]): string {
  const lines: string[] = [];
  const textTypes = [
    "paragraph",
    "heading_1",
    "heading_2",
    "heading_3",
    "numbered_list_item",
    "bulleted_list_item",
    "quote",
  ];

  for (const block of blocks) {
    if (textTypes.includes(block.type)) {
      const text = plainText(block[block.type]?.rich_text).trim();
      if (text) lines.push(text);
    }
  }

  return lines.join("\n");
}
