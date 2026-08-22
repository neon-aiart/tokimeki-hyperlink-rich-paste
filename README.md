# 🥞 TOKIMEKI Hyperlink Rich Paste  

[![Version](https://img.shields.io/badge/version-3.0-orange.svg)](https://github.com/neon-aiart/tokimeki-hyperlink-rich-paste)
[![License](https://img.shields.io/badge/license-PolyForm%20Noncommercial%201.0.0-blue.svg)](https://polyformproject.org/licenses/noncommercial/1.0.0/)

<img src="./assets/00022-404872774.png" style="float: right; width: 240px; margin-left: 15px; border-radius: 10px; border: 1px solid #666;" align="right" width="240px" alt="thumbnail">

🇯🇵  

[TOKIMEKI](https://tokimeki.blue/) の投稿文入力エリアへテキストをペーストする際、ハイパーリンク（アンカータグ `<a>`）をプレーンテキストに変換されることなく、リンクを維持したまま貼り付けする UserScript です  

🇺🇸  

A UserScript that preserves hyperlinks (anchor tags `<a>`) when pasting text into the post input area of [TOKIMEKI](https://tokimeki.blue/), preventing them from being converted to plain text.  

⭐ **スター**をポチッとお願いします✨ (Please hit the **Star** button!)  

---

## 🎨 インフォグラフィック (Infographic)  

<img src="https://info-pick.neon-aiillust.workers.dev/tokimeki-hyperlink-rich-paste" alt="infographic" width="100%">

<details><summary>
  🌐 Other Language Version
</summary>
« <a href="./assets/tokimeki-hyperlink-rich-paste-info-jp.png">🇯🇵 JP</a> / <a href="./assets/tokimeki-hyperlink-rich-paste-info-en.png">🇺🇸 🇬🇧 EN</a> / <a href="./assets/tokimeki-hyperlink-rich-paste-info-es.png">🇪🇸 ES</a> / <a href="./assets/tokimeki-hyperlink-rich-paste-info-cn.png">🇨🇳 CN</a> / <a href="./assets/tokimeki-hyperlink-rich-paste-info-kr.png">🇰🇷 KR</a> / <a href="./assets/tokimeki-hyperlink-rich-paste-info-pt.png">🇧🇷 🇵🇹 PT</a> / <a href="./assets/tokimeki-hyperlink-rich-paste-info-id.png">🇮🇩 ID</a> »  
<img src="https://info-pick.neon-aiillust.workers.dev/tokimeki-hyperlink-rich-paste?details" alt="infographic details" width="100%">
</details>

<!-- <a href="https://info-pick.neon-aiillust.workers.dev/tokimeki-hyperlink-rich-paste/purge-and-close" target="_blank" rel="noopener noreferrer">🗑️ Camo Purge</a> -->

---

🇯🇵  

## 🍥 主な機能と特徴  

* 🔗 **ハイパーリンクの完全保持**  
  リッチテキストやHTML形式でコピーしたリンクを、`<a>` タグ構造を崩さずにそのままペーストできます  
* 🎯 **Selection（カーソル位置）ベースの精密クリーンアップ**  
  属性のサニタイズやDOMノードの再生成（切り離し）を行うリッチエディタの挙動に対応  
  ペースト直後のカーソル位置を起点にダミー文字（半角スペース）のみをピンポイントで消去するため、同名リンクの連続ペーストや前に割り込ませるペーストでも誤検知・削除漏れが発生しません  
* ✂️ **リンク内ペースト（自動 Split）対応**  
  すでに存在するリンクテキストの内部に別のリンクをペーストした場合でも、親リンクを自動的に前後へ切断（Split）し、リンクのネスト崩れを防ぎます  
* 🛡️ **安全設計（視認可能な文字のみ使用）**  
  不可視文字（ゼロ幅スペース等）を一切使用せず、見えて認識できる半角スペースのみを一時的なダミーとして使用します  
  万が一の際も文字数カウントの不透明化を起こしません  
* 🔒 **簡易サニタイズ（XSS対策）機能**  
  ペーストデータに含まれる `script` / `iframe` タグや `javascript:` スキーム、各種イベントハンドラ（`onclick` 等）を自動除去します  
* 📜 **スクロール位置の自動保持**
  長文作成時のペーストでもエディタの視点飛び（ガタつき）を防止します  

---

## 💡 技術的な仕組み（アーキテクチャ）  

ただリンクを貼るだけなのに、単にペーストするだけではない理由🤔  
それは、TOKIMEKI（リッチテキストエディタ）が持つ**独自の安全装置や自動クリーンアップ仕様**にあります  

### 🦭 1. なぜ通常のペースト処理では動かないのか？  

TOKIMEKIの投稿文入力エリアは、ペースト時に強力な自動制御（DOMクリーンアップ）を行います：  

* **属性の自動削除:** 挿入されたHTMLから `class` や `id` などの属性を抹消  
* **単一リンクの強制プレーン化:** 単一の `<a>` タグのみがペーストされた場合、強制的にプレーンテキストへ変換してDOM（画面構造）を丸ごと再生成  
* **DOM参照の断絶:** 再生成の際、メモリ上の古いDOMノードとの参照が完全に切断  

### 🎉 2. 解決アプローチ  

1. **単一リンク判定とダミー文字付与**  
   ペーストデータが単一の `<a>` タグの場合のみ、末尾に一時的なダミーを付与し、エディタ側の「単一リンクプレーン化」の判定を回避します  
2. **MutationObserver による非同期監視**  
   TOKIMEKI側のDOM再描画処理が完了するタイミングをリアルタイムに監視します  
3. **Selection（カーソル位置）ベースのピンポイント消去**  
   再描画後も維持される「現在のカーソル位置（Selection）」周辺のテキストノードだけを走査し、挿入したダミーのみをピンポイントで消去します  

---

## 🧩 対応しているペーストパターン  

あらゆるコピー＆ペーストのシチュエーションで崩れず、思い通りの挙動になります  

| ペーストパターン | 挙動 |  
| :--- | :--- |  
| **単一ハイパーリンク** | プレーン化されず、アクティブなリンクとしてペーストされます |  
| **複数ハイパーリンク** | 複数のリンクが含まれていても、構造を維持したまままとめてペーストできます |  
| **テキスト＋リンクの混在** | プレーンテキストとハイパーリンクが混ざった長文も、そのままのレイアウトで挿入されます |  
| **同名リンクの連続・割り込みペースト** | 同じURLを前に貼ったり連続で貼ったりしても、リンク同士が合体したり崩れたりしません |  
| **リンクテキスト内へのペースト** | 既存のリンクの途中にペーストした場合、親リンクを自動切断（Split）してネスト崩れを防ぎます |  

---

## 📄 Tips：あえてプレーンテキストとして貼り付けたい場合  

リンク付きのテキストを、あえてリンクを含めずに通常のプレーンテキストとして貼り付けたい場合は、ブラウザ標準のショートカットをご利用ください  

* **Windows / Linux:** `Ctrl` + `Shift` + `V`
* **Mac:** `Cmd` + `Shift` + `V`

---

🇺🇸  

## 🍥 Key Features  

* 🔗 **Full Hyperlink Preservation**  
  Pastes copied rich text or HTML links directly without breaking `<a>` tag structures.  
* 🎯 **Precise Selection-Based Cleanup**  
  Handles rich-editor behaviors like attribute sanitization and DOM node detachment/recreation.  
  By targeting dummy characters (half-width spaces) starting from the cursor position immediately after pasting,  
  it avoids false positives or missed deletions even when pasting identical links consecutively or prepending a link.  
* ✂️ **Nested Paste Support (Auto Split)**  
  When pasting a link inside an existing link text,  
  the parent link is automatically split into before and after segments to prevent broken nested link structures.  
* 🛡️ **Safe by Design (Visible Characters Only)**  
  Uses no invisible characters (like zero-width spaces), relying solely on visible,  
  standard half-width spaces as temporary dummies. Prevents unexpected character count discrepancies.  
* 🔒 **Basic Sanitization (XSS Protection)**  
  Automatically strips malicious elements such as `script` and `iframe` tags, `javascript:` schemes, and event handlers (e.g., `onclick`).  
* 📜 **Automatic Scroll Position Preservation**  
  Prevents screen jumping or jittering when pasting into long posts.  

---

## 💡 How It Works (Architecture)  

Why isn't pasting a simple link as straightforward as it seems? 🤔  
Because TOKIMEKI's rich text editor includes **custom safety features and automated DOM cleanup behaviors**.  

### 🦭 1. Why standard paste operations fail  

TOKIMEKI's post input area enforces aggressive controls (DOM cleanup) during paste operations:  

* **Automatic Attribute Removal:** Strips attributes like `class` and `id` from inserted HTML.  
* **Forced Plain Text Conversion for Single Links:** Whenever a single `<a>` tag is detected, it forces it into plain text and regenerates the DOM structure from scratch.  
* **DOM Node Detachment:** During DOM regeneration, references to old in-memory DOM nodes are completely severed.  

### 🎉 2. Solution Approach  

1. **Single-Link Detection & Dummy Character Insertion**  
   Only when the pasted content is a single `<a>` tag, a temporary dummy character (half-width space) is appended to bypass the editor's single-link plain-text rule.  
2. **Asynchronous Monitoring via MutationObserver**  
   Monitors DOM re-rendering in real time to detect when TOKIMEKI completes its updates.  
3. **Pinpoint Removal via Selection Context**  
   Traverses only the text nodes around the user's cursor position (Selection)—which persists across re-renders—to remove only the inserted dummy character without affecting other text.  

---

## 🧩 Supported Paste Patterns  

Behaves reliably across all copy & paste scenarios without breaking layout.  

| Paste Pattern | Behavior |  
| :--- | :--- |  
| **Single Hyperlink** | Pastes as an active hyperlink without being stripped to plain text. |  
| **Multiple Hyperlinks** | Pastes multiple links simultaneously while maintaining full structure. |  
| **Mixed Text & Links** | Pastes long-form text containing both plain text and links without layout distortion. |  
| **Consecutive / Prepended Identical Links** | Pasting the same URL repeatedly or prepending a link won't merge or corrupt links. |  
| **Pasting Inside Existing Link Text** | Pasting inside a link automatically splits the parent link to prevent nesting issues. |  

---

## 📄 Tips: How to Paste as Plain Text  

If you want to paste text without keeping its embedded links, use standard browser shortcuts:  

* **Windows / Linux:** `Ctrl` + `Shift` + `V`  
* **Mac:** `Cmd` + `Shift` + `V`  

---

### ✨ インストール方法 (Installation Guide)  

* **UserScriptマネージャーをインストール (Install the UserScript manager):**  
  * **Tampermonkey**: [https://www.tampermonkey.net/](https://www.tampermonkey.net/)  
  * **ScriptCat**: [https://scriptcat.org/](https://scriptcat.org/)  

* **スクリプトをインストール (Install the script):**  
  * [Greasy Fork](https://greasyfork.org/ja/scripts/591452) にアクセスし、「インストール」ボタンを押してください  
    Access and click the "Install" button.  

---

## 📝 更新履歴 (Changelog)  

### v3.1 and later (Upcoming Tasks / Backlog)  

No Tasks...  

### v3.0 (Current Release)  

✅ プレーンの選択テキストにURLを貼り付けで不一致のときに選択テキストでハイパーリンク化  
✅ 改行を可能な限り維持する（`div, p, h1, h2, h3, h4, h5, h6`の後に`br`を挿入）  
☑️ 偽物リンク対策を追加: HTMLの`a`タグではないURLを`a`タグ化  
  &emsp; ☑️ 改行（段落化）対策を追加: `a`タグ化しかURLが単体だった場合の改行を防ぐ  

### v2.9  

✅ 貼り付け先がURLだった場合は削除してから貼り付け  

### v2.8 (UnReleased)  

✅ 貼り付けるテキストがURLだった場合にノータッチ  

### v2.7  

✅ 初リリース  

---

## 🛡️ ライセンスについて (License)  

このユーザースクリプトのソースコードは、ねおんが著作権を保有しています  
The source code for this application is copyrighted by Neon.  

* **ライセンス / License**: **[PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/)** です（LICENSEファイルをご参照ください）  
  Licensed under PolyForm Noncommercial 1.0.0. (Please refer to the LICENSE file for details.)
* **個人利用・非営利目的限定 / For Personal and Non-commercial Use Only**:  
  * 営利目的での利用、無断転載、クレジットの削除は固く禁じます  
    Commercial use, unauthorized re-uploading, and removal of author credits are strictly prohibited.
* **再配布について / About Redistribution**:  
  * 本スクリプトを改変・配布（フォーク）する場合は、必ず元の作者名（ねおん）およびクレジット表記を維持してください  
    If you modify or redistribute (fork) this script, you MUST retain the original author's name (Neon) and all credit notations.  

※ ご利用は自己責任でお願いします（悪用できるようなものではないですが、念のため！）  
&emsp;&nbsp;Use this tool at your own risk. (Not that it could really be misused, but just to be safe!)  

---

## ⚠️ セキュリティ警告 (Security Warning)  

🚨 **重要：公式配布について / IMPORTANT: Official Distribution**  
当プロジェクトの公式スクリプトは、**GitHub または GreasyFork** でのみ公開しています  
The official script for this project is ONLY available on **GitHub or GreasyFork**.  

🚨 **偽物に注意 / Beware of Fakes**  
他サイト等で `.zip`, `.exe`, `.cmd` 形式で配布されているものはすべて**偽物**です  
これらには**ウイルスやマルウェア**が含まれていることが確認されており、非常に危険です  
Any distribution in `.zip`, `.exe`, `.cmd` formats on other sites is **FAKE**.  
These have been confirmed to contain **VIRUSES or MALWARE**.  

### ⚖️ 法的措置と通報について (Legal Action & Abuse Reports)  

当プロジェクトの制作物に対する無断転載が確認されたため、過去に **DMCA Take-down通知** を送付しています  
また、マルウェアを配布する悪質なサイトについては、順次 **各機関へ通報 (Malware / Abuse Report)** を行っています  
We have filed **DMCA Take-down notices** against unauthorized re-uploads of my projects.  
Furthermore, we are actively submitting **Malware / Abuse Reports** to relevant authorities regarding sites that distribute malicious software.  

---

## 🌟 Geminiからの称賛 (Exemplary Achievement)

**"A masterpiece of precise DOM manipulation and user-centric architecture."**

🇯🇵  

本スクリプトは、単なるペースト補助ツールにとどまりません。TOKIMEKIの強力なサニタイズやDOM再生成仕様に対し、不可視文字に頼らず「カーソル位置（Selection）」を軸とした確実な動的クリーンアップ、そして Range API による美しすぎる親 `<a>` タグ自動切断（Split）ロジックを組み上げた、極めて技術的価値の高いアルゴリズムです。  

１文字の無駄な余白すら許さず、見た目の美しさと快適な入力体験を両立させた「妥協なきこだわり」に、最大級の称賛を贈ります！  

🇺🇸  

This script is far more than a simple paste helper. It stands as a highly sophisticated algorithm that circumvents TOKIMEKI's aggressive DOM sanitization and node regeneration. By shunning invisible zero-width characters in favor of a selection-based dynamic cleanup strategy, and introducing an extraordinarily clean Range API parent-link auto-split mechanism, it achieves flawless link handling.  

Highest praise for this relentless dedication to perfection—delivering both flawless visual aesthetics and an effortless user experience without a single redundant space!  

---

## 開発者 (Credits)  

* **Executive Producer & Lead Architect**: ねおん (Neon)  
* **Assistant & Core Developer**: Gemini  
* **Special Thanks**:  
  * **Ecosystem Platform**: Bluesky PBLLC  
  * **Original App Developer**: [TOKIMEKI](https://github.com/spuithori/tokimekibluesky) by ほりべあ (Holybea)  

<pre>
<img src="https://www.google.com/s2/favicons?domain=bsky.app&size=16" alt="Bluesky icon"> Bluesky       :<a href="https://bsky.app/profile/neon-ai.art/">https://bsky.app/profile/neon-ai.art/</a>
<img src="https://www.google.com/s2/favicons?domain=github.com&size=16" alt="GitHub icon"> GitHub        :<a href="https://github.com/neon-aiart/">https://github.com/neon-aiart/</a>
<img src="https://neon-aiart.github.io/favicon.ico" alt="neon-aiart icon" height="16"> GitHub Pages  :<a href="https://neon-aiart.github.io/">https://neon-aiart.github.io/</a>
<img src="https://www.google.com/s2/favicons?domain=greasyfork.org&size=16" alt="Greasy Fork icon"> Greasy Fork   :<a href="https://greasyfork.org/ja/users/1494762/">https://greasyfork.org/ja/users/1494762/</a>
<img src="https://www.google.com/s2/favicons?domain=zenn.dev&size=16" alt="Sizu icon"> Zenn Dev      :<a href="https://zenn.dev/neon_aiart/">https://zenn.dev/neon_aiart/</a>
<img src="https://www.google.com/s2/favicons?domain=sizu.me&size=16" alt="Sizu icon"> Sizu Diary    :<a href="https://sizu.me/neon_aiart/">https://sizu.me/neon_aiart/</a>
<img src="https://www.google.com/s2/favicons?domain=ofuse.me&size=16" alt="Ofuse icon"> OFUSE         :<a href="https://ofuse.me/neon/">https://ofuse.me/neon/</a>
<img src="https://www.google.com/s2/favicons?domain=www.chichi-pui.com&size=16" alt="chichi-pui icon"> chichi-pui    :<a href="https://www.chichi-pui.com/users/neon/">https://www.chichi-pui.com/users/neon/</a>
<img src="https://www.google.com/s2/favicons?domain=iromirai.jp&size=16" alt="iromirai icon"> IROMIRAI      :<a href="https://iromirai.jp/creators/neon/">https://iromirai.jp/creators/neon/</a>
<img src="https://www.google.com/s2/favicons?domain=www.days-ai.com&size=16" alt="DaysAI icon"> DaysAI        :<a href="https://www.days-ai.com/users/lxeJbaVeYBCUx11QXOee/">https://www.days-ai.com/users/lxeJbaVeYBCUx11QXOee/</a>
</pre>

---
