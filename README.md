# SNS自動投稿ツール(就活生向け人事採用アカウント)

Notionのコンテンツデータベースをソースに、**無料スタックのみ**でInstagram/noteへの投稿を支援するツール。
X(Twitter)は有料APIが必須のため対象外。

## 対応範囲(MVPのスコープ)

| 媒体 | 投稿形式 | 自動化レベル |
|---|---|---|
| Instagram | カルーセル | **完全自動**(画像生成→投稿まで自動実行) |
| Instagram | リール・単発ポスト | 半自動(本文をDiscordに通知し、人が投稿) |
| note | 記事 | 半自動(本文をDiscordに通知し、人が投稿) |

リール(動画)・note記事・Instagram単発ポストは、動画編集や画像選定など人の判断が必要なため、
無料範囲でのMVPでは「本文自動生成+通知」までとし、実投稿は手動としています。
カルーセルのみ完全自動化されているのは、テキストスライド画像の生成〜投稿までを機械的に完結できるためです。

## 使用技術(すべて無料)

- **Notion API**:コンテンツのマスタデータ取得・ステータス更新
- **GitHub Actions**:定時実行のスケジューラ(無料枠内で運用)
- **Playwright**:HTMLテンプレートからカルーセル画像を生成
- **GitHub Pages**:生成画像の公開ホスティング(Instagram Graph APIは画像URLが公開されている必要があるため)
- **Instagram Graph API**:カルーセル投稿の自動公開
- **Discord Webhook**:手動投稿依頼・エラー通知

## セットアップ手順

### 1. Notion側の準備

1. https://www.notion.so/my-integrations で新規Integrationを作成し、APIキー(`secret_...`)を取得
2. 対象のデータベース(SNS投稿コンテンツ管理)を開き、右上の「•••」→「コネクト」から作成したIntegrationを接続
3. データベースのURLからデータベースIDを確認(既存の値: `894f67d76f64823797ce813f569adb03`。データベースを複製した場合、複製先の新しいIDに読み替えてください)

### 2. Instagram / Facebook Developer側の準備

1. Instagramアカウントを「プロアカウント(ビジネス or クリエイター)」に切り替える(アプリの設定から無料でできます)
2. そのアカウントに紐づく**Facebookページ**を用意する(未作成なら無料で新規作成)
3. https://developers.facebook.com でアプリを新規作成(タイプ:「ビジネス」)
4. アプリに「Instagram Graph API」プロダクトを追加
5. 「役割」→「Instagramテスター」に自分のアカウントを追加し、Instagram側で招待を承認する
   - **自分のアカウントのみで運用する場合はApp Reviewは不要**です
6. Graph API Explorerまたはアプリのアクセストークンツールで、`instagram_basic`, `instagram_content_publish`, `pages_show_list` 権限を持つ長期アクセストークンを発行
7. Instagram Business Account IDを確認(Graph API Explorerで `me/accounts` → 該当ページID → `?fields=instagram_business_account` で取得)

> 長期アクセストークンは60日で失効します。失効前に再発行し、GitHub Secretsを更新してください(将来的にリフレッシュ処理の自動化を検討)。

### 3. Discord Webhookの準備

1. 通知を受け取りたいDiscordチャンネルの設定から「連携サービス」→「ウェブフックを作成」
2. Webhook URLをコピー

### 4. GitHubリポジトリの準備

1. このディレクトリの内容でGitHubリポジトリを作成(プライベートでOK)
2. リポジトリの Settings → Secrets and variables → Actions に以下を登録

   | Secret名 | 値 |
   |---|---|
   | `NOTION_API_KEY` | 手順1で取得したIntegrationのAPIキー |
   | `NOTION_DATABASE_ID` | データベースID |
   | `IG_BUSINESS_ACCOUNT_ID` | 手順2で確認したID |
   | `IG_ACCESS_TOKEN` | 手順2で発行した長期アクセストークン |
   | `DISCORD_WEBHOOK_URL` | 手順3のWebhook URL |

3. Settings → Pages で Source を「Deploy from a branch」→ ブランチ `gh-pages` に設定(初回ワークフロー実行後に選択可能になります)

### 5. 動作確認

- Notionデータベースで対象レコードの「ステータス」を**予約済み**、「投稿予定日」を**今日以前**に設定
- GitHubリポジトリの Actions タブから `SNS Auto Post` ワークフローを手動実行(`workflow_dispatch`)
- カルーセル対象は自動投稿、それ以外はDiscordに通知が届くことを確認

## ローカルでの動作確認

```bash
npm install
npx playwright install chromium
cp .env.example .env  # 値を埋める
npm run generate       # 画像生成 + 手動投稿通知のテスト
```

`npm run publish` はGitHub Pagesに画像が公開されている前提のため、ローカル単体では
`PUBLIC_IMAGE_BASE_URL` に実際に公開済みの画像URLを指定しない限り失敗します(想定通りの挙動です)。

## Notion側の運用ルール

- 新しい投稿ネタは「下書き」→ 内容確定後「予約済み」+「投稿予定日」を設定
- カルーセルの本文は、見出しに **「スライド構成」「台本」等の文言**を含め、その配下を
  番号付きリスト/箇条書きにする(1項目=1スライドとしてパースされます)
- 「レビュー中」は本ツールでは「エラー発生」または「手動投稿の通知済み」の両方の意味で使われます。
  手動投稿が完了したら、人の手で「投稿済み」に変更してください

## 今後の拡張候補

- リール用の動画自動生成(Ken Burns風のスライドショー化。ffmpeg利用で無料実装可能)
- Instagramインサイト取得によるエンゲージメント分析のNotion書き戻し
- アクセストークンの自動リフレッシュ
- noteの投稿自動化(公式APIが提供され次第、または許容範囲でのブラウザ自動化を検討)
