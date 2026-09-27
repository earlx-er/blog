---
title: Unity 6のMultiplayer Play Modeがマルチプレイゲーム開発の救世主になりそう
slug: unity-multiplayer-play-mode
category: tech
description: Unity 6のMultiplayer Play Modeを自作のオンラインゲームで試し、動作と導入時の注意点をまとめる。
date: '2026-08-01'
tags:
  - Unity
  - Multiplayer
draft: false
source: 'https://zenn.dev/clay_andromeda/articles/unity-multiplayer-play-mode'
---

「めっちゃカメレオン」はじめ、現代はとにかくCo-opゲーム、マルチプレイのゲームが大人気です。必然、Unityでもマルチプレイのゲームを作りたい！という需要は高まっているわけで。

が！マルチプレイのゲームの開発は大変！個人的に一番辛いと感じているのは動作確認のために、複数台の操作を1人で賄わなければならないこと。

これまではUnityに文句を言いながら、極力楽して動作確認する環境を用意しゲームを作ってきたわけですが……Unity 6では公式からマルチプレイゲーム開発を補助するツールを提供してくれるようになりました。

https://unity.com/ja/features/multiplayer

今回はUnity 6から利用可能になった「Multiplayer Play Mode」を検証してみたので、その紹介をさせていただきます。

## 検証環境

- Unity 6000.5.3f1
- Multiplayer Play Mode 2.0.2
- Windows 11

## Unity 6以前のマルチプレイゲーム開発

Unity 6より前、我々はマルチプレイゲームをどう作ってきたか整理しましょう。なおここでは以下を前提とします。

- クライアントサーバーモデルで通信していること（P2Pでも多分大差ないとは思うけど）
- サーバーはUnityとは別で実装済であること

| 手法 | メリット | デメリット |
| --- | --- | --- |
| 1. 複数cloneしてUnity Editorを複数起動する | ・単純 | ・コードを共有できない。編集側のプロジェクトで一度commit & pushして、動作確認用のプロジェクトでcloneしてやる必要がある。<br>・Unityを複数起動するのは重い。<br>・全く同じデータが複数作られるので、ストレージ容量を食う。 |
| 2. シンボリックリンクを張ったうえでUnity Editorを複数起動する | ・コードやアセットは共通のものを使うため、ディスク容量を節約できる。<br>・同期の手間がない。 | ・シンボリックリンクを使う時特有の不具合をたまに踏む。<br>・やっぱりUnity Editor複数起動は重い。 |
| 3. ビルドして出来たバイナリとUnity Editorを組み合わせる | ・Editorよりは動作が軽い。<br>・ビルド後の実機で見る癖がつく。 | ビルド待ちが毎回発生する。イテレーション速度最悪。 |

他に、 [ParrelSync](https://github.com/VeriorPies/ParrelSync) など、マルチプレイゲーム開発の難しさを取り払おうと目指した非公式プロジェクトもあるようです（使ったことはない）。

## Multiplayer Play Modeについて

Multiplayer Play Modeとは、Unity 6以降で使えるようになった、1つのUnity Editorで最大4人のプレイヤーを実行できる機能です。

Unity Editorを複数台起動するのとは異なり、編集機能などを削ぎ落とした軽量Editorインスタンス（Virtual Player）が生成されるため、マルチプレイゲーム開発のテストのイテレーション速度を高速化できる、らしい。

![複数のVirtual Playerでゲームを動かしている画面](/images/zenn/unity-multiplayer-play-mode/image01.png)

https://docs.unity3d.com/Packages/com.unity.multiplayer.playmode@2.0/manual/index.html

Libraryフォルダを起動するプロセス分複製し、Assets、ProjectSettings、Packagesなどは本体と共有する仕組み。つまり、複数cloneする手法と比べ、編集を同期する手間もなく、また大量のアセットを複製してストレージ容量をドカ食いすることもありません。

この手のUnityの新機能は、Unityが提供する標準機能、例えばNetcode for GameObjectsを使わなければ活用できないんだろうなー、と思って深追いしていなかったのですが、どうやらそうではないらしいぞ？という情報を耳にしたため、本当なのか、試してみることにしました。

## MagicOnion製のオンラインゲームでMultiplayer Play Modeを使ってみる

[MagicOnion](https://cysharp.github.io/MagicOnion/ja/) を使ったリアルタイム通信可能なローカルサーバーを実装して、その上で動くオンラインゲームを作ってみました。（Claude Fable 5に任せたら3-4時間くらいで完成しました。すごすぎ）

非常にシンプルなゲームで、

タイトル画面でアカウントを作り（もう作成済ならそのアカウントを引き続き使う）、

![デモゲームのタイトル画面](/images/zenn/unity-multiplayer-play-mode/image02.png)

4人集まるまで待つルームを立てて、マッチング成立するのを待ち、

![4人のマッチングを待つ画面](/images/zenn/unity-multiplayer-play-mode/image03.png)

4人で玉を打ち合って生き残りを決めるバトルロイヤル。

![4人対戦のバトルロイヤル画面](/images/zenn/unity-multiplayer-play-mode/image04.png)

サーバーはlocalhostで動いています。

このゲームを、Multiplayer Play Modeで実行してみた様子が、以下のGIFです。

![4画面で同時に動作するデモゲーム](/images/zenn/unity-multiplayer-play-mode/gif01.gif)

左上がUnity Hubから起動したEditorです。自作のサーバーシステムであっても、1つのUnity Editorから3つの子プレイヤー（Virtual Player）が生成されて、それぞれ個別にサーバーとの接続を確立しゲームを遊べています。4画面同時デバッグが実現できました。

初回起動こそやや時間がかかりますが、それ以降は軽快そのもの。Editor複数起動と比べたら遥かに楽な開発体験が得られました。

## Multiplayer Play Modeを使う上での注意点

Multiplayer Play Mode（MPPM）では、アセットは全プレイヤー共通したものを使い、Libraryだけを複製します。

ということはアセットとしてデバッグ用の設定を置くような設計をしていた場合、すんなりMPPMを導入できなさそうです。ScriptableObjectとしてエディタごとにデバッグ設定を保持しておく手法は時々見かけますが、Unity 6以降では避けたほうがよさそう。

また、PlayerPrefs、ProjectSettingsも全プレイヤーで共通した値を使います。ですので、PlayerPrefsにアカウント設定を埋め込むような設計をしていると、全てのプレイヤーが共通の設定を見にいくことになり破綻します。マルチプレイゲームを作っているのなら、PlayerPrefsの利用には注意しましょう。

なお、今回のデモプロジェクトでは、各プレイヤーごとにApplication.dataPathが一意であることを利用して、Application.persistentDataPathに、Application.dataPathのハッシュでアカウント情報を保持するファイル名を決める実装をしていました。

## その他触ってみての感想

- 「Run in background」設定をONにしないと、非アクティブ状態のGameビューは更新されません。MPPMを使うならON必須かな。
- Virtual Playerに、編集したシーン情報が反映されないことがまれにありました。まだまだ更新が頻繁に行われているPackageなので、多少不安定なのは目をつぶりましょう…
- Virtual PlayerはGameビューが上半分、Consoleが下半分という並びを変えることができません。サイズの調整はできますが。モニター上でのベストな配置を見つけるのが難しいかも。
  - その代わり、Virtual Player上でHierarchy、Inspector、Profiler、Sceneビューが見れます。すごい。

## まとめ

というわけで、Unity 6から使える新Package「Multiplayer Play Mode」の検証をした記事でした。制約はあるものの、十分実用に足る素晴らしい機能でした。マルチプレイゲーム開発が捗る。MPPMにはまだ検証できていない機能があるようなので、おいおい調査します。

最近のUnityは、現場のゲーム開発者が欲しいと思っている機能をバンバン作ってくれて嬉しいですね…！

## 補足

今回実装したプロジェクト（Claude Fable 5に書かせたデモで、とても実用に足る品質ではないのでご注意ください）

https://github.com/clayAndromeda/MultiPlayerGameTemplate
