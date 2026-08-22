// ==UserScript==
// @name           TOKIMEKI Hyperlink Rich Paste
// @version        3.1
// @icon           data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🥞</text></svg>
// @description    Keep hyperlinks active when pasting into TOKIMEKI editor
// @description:ja TOKIMEKIの入力エリアへのペースト時にハイパーリンク（アンカータグ）を維持します
// @author         ねおん
// @namespace      https://bsky.app/profile/neon-ai.art
// @homepage       https://github.com/neon-aiart
// @match          https://tokimeki.blue/*
// @match          https://tokimekibluesky.vercel.app/*
// @match          http://localhost:5173/*
// @grant          none
// @license        PolyForm Noncommercial 1.0.0; https://polyformproject.org/licenses/noncommercial/1.0.0/
// ==/UserScript==

/**
 * ==============================================================================
 * IMPORTANT NOTICE / 重要事項
 * ==============================================================================
 * Copyright (c) 2026 ねおん (Neon)
 * Licensed under the PolyForm Noncommercial License 1.0.0.
 * * [JP] 本スクリプトは個人利用・非営利目的でのみ使用・改変が許可されます。
 * 無断転載、作者名の書き換え、およびクレジットの削除は固く禁じます。
 * 本スクリプトを改変・配布（フォーク）する場合は、必ず元の作者名（ねおん）
 * およびこのクレジット表記を維持してください。
 * * [EN] This script is licensed for personal and non-commercial use only.
 * Unauthorized re-uploading, modification of authorship, or removal of
 * author credits is strictly prohibited. If you fork this project, you MUST
 * retain the original credits and authorship.
 * ==============================================================================
 */

(function() {
    'use strict';

    const SCRIPT_VERSION = '3.1';
    const DEBUG = false;
    if (DEBUG) console.log(`[${getFormattedDateTime()}] 🥞 Hyperlink Rich Paste v${SCRIPT_VERSION}: デバッグモード`);

    // 監視observerの参照
    let activeObserver = null;
    let activeTimer = null;

    // TOKIMEKI対策として付与するダミー文字（半角スペース）
    const DUMMY_CHAR = ' ';

    function getFormattedDateTime() {
        const now = new Date();

        const pad = (num) => num.toString().padStart(2, '0'); // ２桁にする関数

        const y = now.getFullYear();
        const m = pad(now.getMonth() + 1);
        const d = pad(now.getDate());
        const h = pad(now.getHours());
        const min = pad(now.getMinutes());
        const s = pad(now.getSeconds());

        return `${y}/${m}/${d} ${h}:${min}:${s}`;
    }

    document.addEventListener('paste', function(e) {
        // イベントが発生した要素が contenteditable か判定
        const target = e.target.closest('[contenteditable="true"]');
        if (!target) return;

        // クリップボードから HTML と Plain Text を取得
        const clipboardData = e.clipboardData || window.clipboardData;
        if (!clipboardData) return;

        const htmlData = clipboardData.getData('text/html');
        const plainTextData = clipboardData.getData('text/plain') ? clipboardData.getData('text/plain').trim() : '';

        // 貼り付けようとしている URL と「純粋なURL形式か」を抽出・判定
        let pastingHref = '';
        let isPlainLinkFormat = false;

        if (htmlData) {
            // 一時的に DOM を作成して安全に解析
            const parser = new DOMParser();
            const tempDoc = parser.parseFromString(htmlData, 'text/html');

            // HTML 内から <a> タグ要素だけをピンポイントで抽出（改行やコメントを除外）
            const firstLink = tempDoc.querySelector('a');
            if (firstLink) {
                pastingHref = firstLink.getAttribute('href') ? firstLink.getAttribute('href').trim() : '';

                // <a> タグ以外にテキストや他の要素が存在しないかチェック！
                const bodyText = tempDoc.body.textContent.trim();
                const linkText = firstLink.textContent.trim();

                isPlainLinkFormat = (bodyText === linkText) && isPlainUrlLink(firstLink);
            }
        }

        // HTML形式のリンクがない場合、プレーンテキスト自体がURLかチェック
        if (!pastingHref && isUrlString(plainTextData)) {
            pastingHref = plainTextData;
            isPlainLinkFormat = true;
        }

        // 貼り付け先（選択範囲・カーソル位置）の状態を解析してログに出す
        let selection = window.getSelection();
        let selectedText = selection ? selection.toString().trim() : ''; // 選択中の文字列（テキスト）
        let targetNodeName = 'NONE';
        let isInsideAnchor = false;
        let parentAnchorHref = null;

        if (selection && selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            const container = range.startContainer;

            // カーソルがあるノードの種別
            targetNodeName = container.nodeName;

            // カーソルが <a> タグの中にあるか判定
            const parentLink = container.nodeType === Node.ELEMENT_NODE
                ? container.closest('a')
                : (container.parentElement ? container.parentElement.closest('a') : null);

            if (parentLink) {
                isInsideAnchor = true;
                parentAnchorHref = parentLink.getAttribute('href');
            }
        }

        if (DEBUG) {
            console.groupCollapsed(`[DEBUG] [${getFormattedDateTime()}] 🥞 Hyperlink Rich Paste v${SCRIPT_VERSION}（${plainTextData.length}文字）\n`);
            // オブジェクトとして出力（ブラウザが自動で折りたたみ化してくれる！）
            console.log('[DEBUG] ClipBoard & Selection Data:', {
                selectedText: selectedText || '(なし)',
                clipBoardHTML: htmlData || '(null)',
                clipBoardPlain: plainTextData || '(null)',
            });
            console.log('[DEBUG] --- 貼り付け先（Target）の状態 ---');
            console.log('[DEBUG] Target Element:', target.tagName);    // contenteditable要素自体
            console.log('[DEBUG] Caret Node:', targetNodeName);        // カーソルが直接接しているノード (#text や DIV など)
            console.log('[DEBUG] Is Inside <a>:', isInsideAnchor);     // <a> タグの中かどうか
            console.log('[DEBUG] Parent <a> Href:', parentAnchorHref); // <a> タグの中ならそのURL
            console.log('[DEBUG] --- クリップボードの中身の状態 ---');
            console.log('[DEBUG] Pasting Href:', pastingHref);
            console.log('[DEBUG] Is Plain Link Format:', isPlainLinkFormat);
            console.log('[DEBUG] ----------------------------------');
            console.groupEnd();
        }

        if (!pastingHref) {
            if (DEBUG) console.log('[DEBUG] !pastingHrefのためreturn:', pastingHref);
            return;
        };

        // 選択テキストがURLの消去前判定（URLかどうかを保持）
        const isSelectionUrl = isUrlString(selectedText);

        // 選択テキストがURLの場合の消去処理（詐欺URL防止）
        if (pastingHref) {
            handleUrlSelectionOverwrite(pastingHref);

            // 選択情報を最新の状態で再取得して更新しますっ！
            selection = window.getSelection();
            selectedText = selection ? selection.toString().trim() : '';
        }

        // デフォルトのペースト処理をキャンセルして独自処理へ！
        e.preventDefault();

        // 挿入用の DOM を用意
        let doc;
        if (htmlData) {
            // HTMLコード内の余分な改行（\r, \n）や余白テキストノードの影響を防ぐため、事前に除去！
            const cleanHtmlData = htmlData.replace(/[\r\n]+/g, '');

            const parser = new DOMParser();
            doc = parser.parseFromString(cleanHtmlData, 'text/html');

            // 【改行（段落化）対策】子要素が１つしかない`div`や`p`がある場合、中身だけに展開する！
            while (
                doc.body.children.length === 1 &&
                ['DIV', 'P',].includes(doc.body.children[0].tagName)
            ) {
                const wrapper = doc.body.children[0];
                // 中身のノード（<span> や <a> など）を outerHTML 等で親（body）に昇格！
                doc.body.innerHTML = wrapper.innerHTML;
            }

            // 【偽物リンク対策】<a> の中にない URL 文字列（span等）を探して <a> タグ化する！
            const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, null);
            const nodesToReplace = [];

            let currentNode;
            while ((currentNode = walker.nextNode())) {
                // 親要素が <a> タグでなく、中身が URL 文字列の場合
                if (!currentNode.parentElement.closest('a') && isUrlString(currentNode.nodeValue.trim())) {
                    nodesToReplace.push(currentNode);
                }
            }

            // 対象のテキストノードを <a> タグに置き換え！
            nodesToReplace.forEach(node => {
                const rawText = node.nodeValue;
                const url = rawText.trim();
                const a = doc.createElement('a');
                a.setAttribute('href', url);
                a.textContent = url; // 表示名もURLにする

                // 元のテキストノードを新しい <a> タグに置き換え！
                node.parentNode.replaceChild(a, node);
            });

            // ブロック要素（div, p, h1～h6）の直後に <br> を補完して改行を維持！
            const blocks = doc.body.querySelectorAll('div, p, h1, h2, h3, h4, h5, h6');
            blocks.forEach(block => {
                // ブロック要素の末尾に br がなければ追加（最終行以外）
                if (block.nextSibling && block.nextSibling.nodeName !== 'BR') {
                    block.after(doc.createElement('br'));
                }
            });
        } else {
            // プレーンテキスト（またはHTMLなし）のURLの場合
            doc = document.implementation.createHTMLDocument('');
            const a = doc.createElement('a');
            a.setAttribute('href', pastingHref);
            a.textContent = pastingHref;
            doc.body.appendChild(a);
        }

        // クリップボードのテキストが「純粋な1つのURLだけ」かどうかを厳密に判定！
        // 改行や余計な文字が入っていない単一のURL文字列の時だけ true になる
        const isSingleUrlData = isUrlString(plainTextData.trim()) && !/[\r\n]/.test(plainTextData.trim());

        // クリップボードが「純粋な単一URL」の場合のみ、選択テキストで表示名を置換する！
        if (selectedText && !isSelectionUrl && isSingleUrlData) {
            const pastedAnchors = doc.body.querySelectorAll('a');
            pastedAnchors.forEach(a => {
                // 貼り付けるリンクの表示名がURLのままなら、選択中のプレーンテキストに差し替える
                if (isUrlString(a.textContent.trim())) {
                    a.textContent = selectedText;
                    if (DEBUG) console.log('[DEBUG] ハイパーリンク置換処理を実行しますっ！:', selectedText);
                }
            });
        }

        // 簡易サニタイズ（XSS対策）
        sanitizeNode(doc.body);

        // 不要な改行ノードのみを削除
        cleanBlankNodes(doc.body);

        // 【TOKIMEKI対策】単体URL/ハイパーリンクの場合にダミー文字（半角スペース）を付与！
        const hasDummy = createSingleLinkDummyIfNeeded(doc.body);

        // 出力する文字列(innerHTML)を確認
        if (DEBUG) console.log(`[DEBUG] 挿入直前のHTML(v${SCRIPT_VERSION}):`, doc.body.innerHTML);

        // キャレット位置に <a> タグを挿入
        insertFragmentAtSelection(doc.body);

        // ダミーを挿入した場合、TOKIMEKIの処理後に「カーソル付近の半角スペース」だけを削除
        if (hasDummy) removeDummyAtSelectionWithObserver(target);
    }, true);

    // 空白・改行ノードを削除する関数
    function cleanBlankNodes(node) {
        // Array.from で固定化（コピー）してからループすることでインデックスのズレを防止
        const children = Array.from(node.childNodes);

        children.forEach(child => {
            // テキストノードで、かつ改行やスペースのみの場合は削除
            if (child.nodeType === Node.TEXT_NODE && !child.nodeValue.trim()) child.remove();
        });
    }

    /**
     * TOKIMEKIの単体リンクプレーン化処理を回避するハック
     */
    function createSingleLinkDummyIfNeeded(bodyNode) {
        // <body> 直下の要素が <a> タグ1つだけ（または要素数が極少）の場合
        const links = bodyNode.querySelectorAll('a');

        // <body> 直下にある HTML要素（コメント等を除くElementノード）を取得
        const elementChildren = Array.from(bodyNode.childNodes).filter(
            node => node.nodeType === Node.ELEMENT_NODE
        );

        // <a> タグが存在し、かつ実体のある要素が <a> タグ1つだけの場合
        if (links.length === 1 && elementChildren.length === 1) {
            // ダミーとして半角スペースを付与
            bodyNode.appendChild(document.createTextNode(DUMMY_CHAR));
            return true;
        }
        return false;
    }

    /**
     * TOKIMEKIの処理が終わったタイミングで、現在のカーソル位置（Selection）周辺の半角スペースを削除する
     */
    function removeDummyAtSelectionWithObserver(editorTarget) {
        // 前回の監視が残っていたら、先に安全に停止・クリーンアップ
        if (activeObserver) {
            activeObserver.disconnect();
            activeObserver = null;
        }
        if (activeTimer) {
            clearTimeout(activeTimer);
            activeTimer = null;
        }

        const cleanup = () => {
            const selection = window.getSelection();
            if (!selection.rangeCount) return;

            const range = selection.getRangeAt(0);
            let container = range.startContainer;

            // カーソルがテキストノード内にある場合、または要素ノードにある場合で取得元を分ける
            let targetTextNode = null;

            if (container.nodeType === Node.TEXT_NODE) {
                // カーソルが直接テキストノード（ダミーの半角スペース等）の上にある場合
                targetTextNode = container;
            } else if (container.nodeType === Node.ELEMENT_NODE) {
                // カーソルが要素ノード内にある場合、Offsetの位置から該当子ノードを取得
                const childNode = container.childNodes[range.startOffset] || container.childNodes[range.startOffset - 1];
                if (childNode) {
                    if (childNode.nodeType === Node.TEXT_NODE) {
                        targetTextNode = childNode;
                    } else if (childNode.nodeType === Node.ELEMENT_NODE) {
                        // <a> タグの直後にある nextSibling（テキストノード）を探す
                        if (childNode.nextSibling && childNode.nextSibling.nodeType === Node.TEXT_NODE) {
                            targetTextNode = childNode.nextSibling;
                        }
                    }
                }
            }

            // もしカーソルの直前に <a> タグがあり、その直後がテキストノードの場合も探す
            if (!targetTextNode && container.previousSibling && container.previousSibling.nodeType === Node.TEXT_NODE) {
                targetTextNode = container.previousSibling;
            }

            // 見つかったテキストノードが半角スペースで始まっていたら先頭の半角スペースを消去！
            if (targetTextNode && targetTextNode.nodeValue) {
                if (targetTextNode.nodeValue.startsWith(DUMMY_CHAR)) {
                    targetTextNode.nodeValue = targetTextNode.nodeValue.slice(DUMMY_CHAR.length);
                    if (targetTextNode.nodeValue === '') targetTextNode.remove();
                }
            }
        };

        // DOM監視インスタンスの作成
        const observer = new MutationObserver((mutations, obs) => {
            // TOKIMEKI側のクリーンアップ処理（DOM変更）が一段落し、
            // <a> タグが正しく残っている状態か確認
            const hasActiveLink = editorTarget.querySelector('a') !== null;

            if (hasActiveLink) {
                // 処理を停止してダミー文字（半角スペース）を除去
                obs.disconnect();
                activeObserver = null; // 終わったらリセット
                if (activeTimer) clearTimeout(activeTimer);
                cleanup();
            }
        });

        // エディタ内部のテキスト・子ノード変更の監視を開始
        observer.observe(editorTarget, {
            childList: true,
            subtree: true,
            characterData: true,
        });

        // 安全装置：2秒後に強制的に監視解除＋クリーンアップ
        activeTimer = setTimeout(() => {
            observer.disconnect();
            activeObserver = null;
            cleanup();
        }, 2000);
    }

    /**
     * 選択範囲（カーソル位置）に HTML 要素群を挿入する関数 (Range API)
     */
    function insertFragmentAtSelection(sourceBody) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        let range = selection.getRangeAt(0);
        range.deleteContents(); // 選択中の文字列があれば削除

        // 1. ペースト位置（カーソル）が <a> タグの内部にあるか判定
        let container = range.startContainer;
        let parentLink = null;
        if (container.nodeType === Node.ELEMENT_NODE) {
            parentLink = container.closest('a');
        } else if (container.parentElement) {
            parentLink = container.parentElement.closest('a');
        }

        // 2. もし <a> タグの中なら、親の <a> タグを自前で綺麗に2つに切断（Split）する！
        if (parentLink) {
            // 前半の <a> タグを作成（カーソルより前のコンテンツを保持）
            const headRange = document.createRange();
            headRange.setStartBefore(parentLink);
            headRange.setEnd(range.startContainer, range.startOffset);
            const headFragment = headRange.extractContents();

            // 後半の <a> タグ（元の parentLink）はカーソルより後のコンテンツが残る

            // 切断された隙間（parentLink の直前）に前半の <a> を挿入
            parentLink.parentNode.insertBefore(headFragment, parentLink);

            // 新しい挿入ターゲットの Range を「前半<a>」と「後半<a>」の隙間（親<a>の外側）にセット！
            const targetRange = document.createRange();
            targetRange.setStartBefore(parentLink);
            targetRange.collapse(true);

            range = targetRange; // 以降はこの「タグとタグの隙間」を挿入先とする
        }

        // 3. DocumentFragment を作成して中身を移し替える
        const fragment = document.createDocumentFragment();
        while (sourceBody.firstChild) {
            fragment.appendChild(sourceBody.firstChild);
        }

        // 最後のノードを記録して、後でカーソルをその直後に移動させる
        const lastNode = fragment.lastChild;

        // エディタ（親要素）のスクロール位置を記憶
        const scrollableParent = container.nodeType === Node.ELEMENT_NODE
            ? container.closest('[contenteditable="true"]')
            : container.parentElement ? container.parentElement.closest('[contenteditable="true"]') : null;

        const scrollTop = scrollableParent ? scrollableParent.scrollTop : 0;

        // 4. 親 <a> タグの外側のクリーンな隙間に、本命の HTML（C + <a>D</a> + E）を安全に挿入！
        range.insertNode(fragment);

        // 5. 空になった（または中身がなくなった）不要な空 <a> タグがあれば掃除
        if (parentLink && !parentLink.hasChildNodes()) parentLink.remove();

        // 挿入したコンテンツの末尾にカーソルを移動
        if (lastNode) {
            range.setStartAfter(lastNode);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
        }

        // スクロール位置を復元してガタつきを防止
        if (scrollableParent) scrollableParent.scrollTop = scrollTop;
    }

    /**
     * <a> タグの表示テキストと href が実質的に同じ「ただのURL貼り付け」かどうか判定する関数
     */
    function isPlainUrlLink(aTag) {
        if (!aTag) return false;

        const text = aTag.textContent.trim();
        const href = aTag.getAttribute('href') ? aTag.getAttribute('href').trim() : '';

        if (!text || !href) return false;

        // 表示テキスト自体が正当なURL形式でなければ「ただのURL貼り付け」ではない！
        if (!isUrlString(text)) return false;

        // 完全一致、または末尾のスラッシュの有無やプロトコルの違いを吸収して比較
        if (text === href) return true;

        try {
            const urlFromText = new URL(text.startsWith('http') ? text : `https://${text}`);
            const urlFromHref = new URL(href, window.location.href);
            return urlFromText.href === urlFromHref.href;
        } catch (err) {
            // URL解析に失敗した場合は通常のテキストリンクとして扱う
            return false;
        }
    }

    /**
     * 選択中のテキストがURLで、貼り付けようとしているURLと異なる場合、
     * 選択テキストを消去して詐欺リンク（見た目と遷移先の食い違い）化を防ぐ関数
     * @param {string} pastingHref 貼り付けようとしているURL文字列
     */
    function handleUrlSelectionOverwrite(pastingHref) {
        if (!pastingHref) return;

        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const selectedText = selection.toString().trim();
        if (!selectedText) return;

        // 選択中のテキストがURL形式かチェック
        if (isUrlString(selectedText)) {
            // 選択テキストのURLと、貼り付けるURLが異なる場合は選択範囲を削除する
            if (!isSameUrl(selectedText, pastingHref)) {
                if (DEBUG) console.log('[DEBUG] 選択中のURLテキストと貼り付け先URLが異なるため、選択範囲を消去して上書きします');
                const range = selection.getRangeAt(0);
                range.deleteContents(); // 選択中の古いURLを消去！
            }
        }
    }

    /**
     * 文字列が正しいURL形式かどうか判定する関数
     */
    function isUrlString(str) {
        if (!str) return false;
        const trimmed = str.trim();

        // 日本語の句読点「。」や「、」が含まれていたら絶対URLじゃない！
        if (/[。、\s]/.test(trimmed)) return false;

        // http:// または https:// で始まる場合
        if (/^https?:\/\/[^\s]+$/i.test(trimmed)) return true;

        // ドメイン形式（例: google.com）の判定（日本語ドメイン以外を厳密にする場合）
        // 末尾がちゃんとしたTLD（.com, .jp等）になっているかチェック！
        try {
            const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
            // ドメイン名にドットが含まれ、かつTLD（末尾）が英字2文字以上か
            return url.hostname.includes('.') && /^[a-z]{2,}$/i.test(url.hostname.split('.').pop());
        } catch (e) {
            return false;
        }
    }

    /**
     * ２つのURL文字列が実質的に同じかどうかを比較する関数
     */
    function isSameUrl(urlStr1, urlStr2) {
        if (urlStr1 === urlStr2) return true;
        try {
            const u1 = new URL(urlStr1.startsWith('http') ? urlStr1 : `https://${urlStr1}`);
            const u2 = new URL(urlStr2.startsWith('http') ? urlStr2 : `https://${urlStr2}`, window.location.href);
            return u1.href === u2.href;
        } catch (e) {
            return urlStr1.trim() === urlStr2.trim();
        }
    }

    // 危険なタグや属性を削除する簡易サニタイズ関数
    function sanitizeNode(node) {
        // スクリプトやスタイルなど不要なタグを除去
        const dangerousTags = node.querySelectorAll('script, style, iframe, object, embed');
        dangerousTags.forEach(el => el.remove());

        // イベントハンドラ（onclick等）や javascript: スキームを削除
        const allElements = [node, ...node.querySelectorAll('*'), ];
        allElements.forEach(el => {
            Array.from(el.attributes || []).forEach(attr => {
                // on から始まるイベント属性を削除
                if (attr.name.startsWith('on')) {
                    el.removeAttribute(attr.name);
                }
                // href / src 内の javascript: スキームを無効化
                if ((attr.name === 'href' || attr.name === 'src') && attr.value.trim().toLowerCase().startsWith('javascript:')) {
                    el.removeAttribute(attr.name);
                }
            });
        });
    }
})();
