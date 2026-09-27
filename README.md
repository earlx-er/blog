# blog.earlx.dev

Obsidianで執筆し、Macから直接Cloudflareに公開する個人サイト。現在はローカル制作の段階です。Cloudflareへの公開にGitHubを使わない方針で、公開操作とデプロイは未実装です。

現在の機能と未着手の作業は[STATUS.md](STATUS.md)に整理しています。

デザインは[Astro公式 Blog スターター](https://astro.build/themes/details/blog/)のシンプルな1カラム構成をもとに、このサイトのページと日本語本文に合わせて調整しています。公式スターターは[Bear Blog](https://github.com/HermanMartinus/bearblog)をもとにしています。

## ローカルで見る

Node.js 22.12以上が必要です。

```sh
npm install
npm run import:obsidian
npm run build:preview
npm run preview
```

表示されたlocalhostのURLを開きます。`build:preview`は下書きも表示するローカル確認用で、出力先は`dist-preview/`です。**このフォルダを公開しないでください。**

デザイン検討中は、`build:preview`で`/design-proposals/`にサイト全体の3案、`/og-proposals/`にOGP画像の比較、`/og-references/`に実在ブログのOGP画像へのリンクを生成します。比較ページは公開用の`dist/`には入りません。

編集中は`npm run dev`で自動更新できます。全文検索はビルド後のプレビューで動作します。

## 原稿を選ぶ

`obsidian.example.json`を参考に、Mac専用の`obsidian.local.json`を作ります。元のObsidianファイルは書き換えません。

```json
{
  "vault": "/absolute/path/to/vault",
  "articles": [
    {
      "file": "02_Memo/記事のタイトル.md",
      "slug": "stable-article-id",
      "category": "diary",
      "publish": false
    }
  ]
}
```

- `file`: 保管庫内の原稿。指定した記事と参照画像だけを取り込みます。
- `slug`: 固定URLの識別子。英小文字・数字・ハイフンで指定し、タイトル変更後も維持します。
- `category`: `diary`（日記・映画など）または`tech`（技術記事）。省略時は`diary`です。記事URLはそれぞれ`/posts/slug/`、`/tech/slug/`になります。
- `publish`: 明示的に`true`とした記事だけ公開用ビルドに入ります。公開する場合は`date`（`YYYY-MM-DD`）も必須です。
- `thumbnail`は任意です。保管庫内の画像を指定すると、記事カードと共有画像に使います。本文に貼っていない画像も選べます。指定しない記事には自動生成OGP画像を使います。
- `thumbnailAlt`は選んだ画像の説明文です。サムネイルを指定する場合に併せて記入してください。
- `title`, `description`（検索結果などに使う説明文）, `tags`, `updated`, `source`（元のnote記事URL）は任意です。
- 原稿のfrontmatterは引き継がず、公開用メタデータはこの選択ファイルで指定します。
- 画像はWebPに変換し、幅1600px以下に縮小、EXIF等のメタデータを除去します。アニメーションGIFは静止画になります。
- 同名画像が複数ある場合は原稿からの相対パスか保管庫内のパスを指定します。
- 画像の欠落・同名衝突・未対応埋め込み・未解決の`[[内部リンク]]`・非公開コメント`%%`はエラーにします。
- URLを単独の行に置いたYouTube動画はプレーヤーに、はてな匿名ダイアリーの記事はリンクカードに変換します。
- `src/content/posts/imported/`と`src/assets/imported/`は毎回再生成します。ここを直接編集しないでください。
- 選択から外した記事は、次の取り込み時に生成物から除かれます。

画像を選ぶ記事では、その項目に`"thumbnail": "99_Assets/cover.jpg"`と`"thumbnailAlt": "記事のカバー写真"`を追加します。

ローカルの選択設定では「注意力散漫な性質はそうそう変わらない」を2026-09-27付で公開対象にしています。`obsidian.local.json`はGit管理外のため、別のMacで再現する際は公開対象と日付を設定してください。

## 公開用の生成

```sh
npm run build
```

`dist/`には下書きの記事ページとその画像を含めません。RSSにも下書きを載せません。このコマンドはアップロードを行いません。ドメインが決まったら`SITE_URL`を設定し、次の段階で公開手順を用意します。

サムネイル未指定の記事には1200×630ピクセルのタイトル入りOGP画像を自動生成し、一覧と記事ページの`og:image`に使います。Diaryはクリーム色、Techは青い背景に「TECH」と入れ、ジャンルを区別します。`thumbnail`を指定した記事はその画像を優先し、中央で1200×630の比率に切り抜いて、一覧用WebPと共有用JPEGに変換します。トップ、両ジャンルの一覧、Tags、About、検索、404にも専用のOGP画像を生成します。下書きの画像はプレビュー用だけに出力されます。公開時は`SITE_URL=https://取得したドメイン`を設定してビルドし、共有先から画像にアクセスできる絶対URLを出力してください。

トップページは両ジャンルの記事を公開日の新しい順に混ぜて画像付きで5件表示し、ジャンル名を添えます。`/posts/`はDiary、`/tech/`はTechの記事一覧です。各一覧は公開日の新しい順に20件ずつ、月ごとの見出しとサムネイル・タイトル・本文冒頭の行で表示し、2ページ目以降は`/posts/page/2/`や`/tech/page/2/`のようなURLになります。RSSと検索には両ジャンルの記事が入ります。

記事のタグは角丸のリンクとして表示し、`/tags/`で全タグと記事数を確認できます。タグ別ページから該当記事へ移動できます。記事末尾には共通タグを優先して同じジャンルの記事を最大3件表示します。該当記事がない場合、関連記事欄は表示しません。

## 変更する場所

- `src/config.ts`: サイト名「blog.earlx.dev」と紹介文、noteリンク
- `src/styles/global.css`: 配色・レイアウト
- `src/pages/about.astro`: プロフィール（確認できた内容のみ）
- `PLAN.md`: 全体計画

noteの自動RSS取得はCloudflare設定段階で実装します。現在はnoteへのリンクを表示し、架空の記事一覧は表示しません。

## 検証

```sh
npm test
npm run check
npm run build:preview
npm run build
```

未公開原稿の取り込み制御、画像変換、欠落・衝突、内部リンク、削除をテストします。検索は`dist-preview/`に生成したPagefindを使用します。
