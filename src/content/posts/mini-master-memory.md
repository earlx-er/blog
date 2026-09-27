---
title: MasterMemoryから学ぶDictionaryより効率的なゲームのマスターデータ管理方法
slug: mini-master-memory
category: tech
description: MasterMemoryの実装を参考に、Dictionaryを使わずゲームのマスターデータを効率よく検索する方法を考える。
date: '2025-08-11'
tags:
  - C#
  - MasterMemory
draft: false
source: 'https://zenn.dev/clay_andromeda/articles/mini-master-memory'
---

ゲーム開発にはパラメータを管理するデータ、いわゆるマスターデータが欠かせません。マスターデータへアクセスする方法を工夫することで、より効率のよいマスターデータ管理手法を開発できたので、紹介します。

## この記事で語ること
- C#にて、Dictionary型でマスターデータを管理する方法のメリットとデメリット
- MasterMemoryについて
- MasterMemoryを参考にした、Dictionary型を使わずにマスターデータのアクセスする方法の提案

## この記事で語らないこと
- マスターデータそのものを入力、管理する方法や、データのシリアライズ手法

## Dictionaryでマスターデータを管理する方法
ゲーム業界では、マスターデータはスプレッドシートや各社秘伝の神Excelマクロで管理することが多いと思われます。
ここでは、RPGゲームを例にして、敵のパラメータを管理するマスターデータを考えてみましょう。

| ID  | 名前    | ラベル      | HP  | 攻撃力 |
| --- | ----- | -------- | --- | --- |
| 1   | スライム  | slime_1  | 10  | 5   |
| 2   | コウモリ  | bat_1    | 12  | 6   |
| 3   | 赤スライム | slime_2  | 20  | 8   |
| 4   | ドラゴン  | dragon_1 | 120 | 30  |

現場では、こうしたマスターデータの雛形をスプレッドシートやExcelを用いプログラマーが作り、プランナー、ゲームデザイナー職の方が入力、管理していくことになるでしょう。

スプレッドシートやExcelで作ったマスターデータは、CSVや独自のバイナリファイルに変換されます。このファイルをゲーム中で読み込むことで、ゲームのプログラムから、マスターデータにアクセスできるようになります。

マスターデータは、IDをキーにしてアクセスします。何かをキーにして値を取得する、と聞いて、プログラマが最初に思いつく実装はDictionary（ハッシュテーブル）を使うことでしょう。

```cs
public record Enemy
{
    public required int Id { get; init; }
    public required string Name { get; init; }
    public required string Label { get; init; }
    public required int Hp { get; init; }
    public required int Power { get; init; }
}

// 実際には、コードベタ書きではなく、CSVや専用のバイナリファイルとして保持される
var masterData = new Enemy[]
{
    new () { Id = 1, Name = "スライム", Label = "slime_1", Hp = 10, Power = 5 },
    new () { Id = 2, Name = "コウモリ", Label = "bat_1", Hp = 12, Power = 6 },
    new () { Id = 3, Name = "赤スライム", Label = "slime_2", Hp = 20, Power = 8 },
    new () { Id = 4, Name = "ドラゴン", Label = "dragon_1", Hp = 120, Power = 30 }
};

var dictionary = new Dictionary<int, Enemy>(masterData.Length);
foreach (var data in masterData)
{
    dictionary.Add(data.Id, data);
}

// 使用例
var slimeParameter = dictionary[1];
Console.WriteLine($"HP: {slimeParameter.Hp}, Pow: {slimeParameter.Power}");
```

（requiredやinitなど、Unityでは普通使えないC#の機能を使っているのは勘弁してください）

### Dictionary型を使うメリット

シンプルで分かりやすいことが一番のメリットでしょう。Dictionaryは（プログラマなら）誰だって分かります。バグ修正や、仕様変更による機能追加にも容易に対応できます。
Dictionaryは、キーを使った高速な検索ができるコレクション型です。ですので、マスターデータが巨大化しても、IDによる検索が極端に遅くなることはありません。

### Dictionary型を使うデメリット

ID以外で検索したい時、Dictionaryが持つ「高速な検索性能」という特性が失われます。例えば、敵のマスターデータをラベルで検索したくなった時を考えると、以下のような実装が考えられます。

```cs
// ラベルで検索する
var slime2Parameter = dictionary.Values.FirstOrDefault(x => x.Label == "slime_2");
Console.WriteLine($"HP: {slime2Parameter.Hp}, Pow: {slime2Parameter.Power}");
```
DictionaryからValuesを取得し、それをLINQの`FirstOrDefault()`などで検索する。`FirstOrDefault()` のやっていることは、ただコレクションの先頭から順番に調べて、最初に条件を満たすものを返す、つまり線形検索です。コレクションの末尾にある値を検索する時は、マスターデータの量に比例して検索時間が長くなります。これはよくない。

では、IDをキーにした辞書とは別に、ラベルをキーにした辞書を作るのはどうか。
```cs
Dictionary<string, Enemy> labelDictionary = new();
```
悪くはない。しかし、Dictionary = ハッシュテーブルを構築するのにかかる時間とメモリが気になります。Dictionaryは検索こそ早いですが、構築にかかるコストは決して安くないのです。


※補足
IDがあるなら、それで検索すればいいじゃないかという声もありますが、現実はそううまくいきません。IDは変わりやすいのです。例えば、新たな敵とした毒スライムを追加することになった。ゲームに登場するのは赤スライム（ID3）とドラゴン（ID4）の間。デザイナーは、マスターデータは登場した順に並んでいてほしいはず。こういう時、IDの並び順は変わります。
IDは変わりやすい。とはいえ、特定の敵を表す不変で一意の値がほしい。そんな要望を満たすために、ラベルを定義しています。

## MasterMemoryはマスターデータの検索をどう実現しているか

Cysharp/MasterMemoryというライブラリがあります。「省メモリ」、「高速なDBロードと構築」、「Dictionaryと同程度の高速な検索」を実現しており、最近の国産モバイルゲームの多くで採用実績がある、素晴らしいライブラリです。

https://github.com/Cysharp/MasterMemory

「高速なDBロードと構築」、「Dictionaryと同程度の高速な検索」をどう実現してるか、開発者のneueccさんはこう書いています。

> ただの「ソート済み配列」を「二分探索」しているだけ、です。データベースの構築が高速なのは、シリアライズされたソート済み配列をデシリアライズするだけで完了するからであり、メモリ効率が良いのは、保持しているのが実体の配列のみだからです。

> 別にDictionaryで良くね？ という点に関しては、ゲーム開発が進んでマスターデータが巨大になった場合に、構築に時間がかかる（ハッシュテーブルを作るコストは意外と安くない）ことと、メモリ使用量（ハッシュテーブルはデータ構造としてはかなり大きめ）、そして検索が1:1のKeyValueのみで柔軟性がないこと（困ったら全件検索、が多発するとかなり効率悪い）が、以前のゲーム開発ではネックになっていました。
https://tech.cygames.co.jp/archives/3269/

なるほど、データを事前にソートして、ただの配列としてもっておくと。マスターデータは読み取り専用であることがほとんどなので、こういう割り切った戦略が使えるわけですね。

プライマリキーである、IDでの検索はこの手法でいいでしょう。ではラベルでの検索、ようはセカンダリキーでの検索はどう実現しているのでしょう。v.3.0以降のMasterMemoryは、SourceGenerator化しているため、実際にMasterMemoryを利用するコードを書いて、生成されるコードを見てみましょう。

```cs
[MemoryTable("enemy"), MessagePackObject(true)]
public record Enemy
{
    [PrimaryKey] public required int Id { get; init; }
    public required string Name { get; init; }
    [SecondaryKey(0)] public required string Label { get; init; }
    public required int Hp { get; init; }
    public required int Power { get; init; }
}

var enemies = new Enemy[]
{
    new () { Id = 1, Name = "スライム", Label = "slime_1", Hp = 10, Power = 5 },
    new () { Id = 2, Name = "コウモリ", Label = "bat_1", Hp = 12, Power = 6 },
    new () { Id = 3, Name = "赤スライム", Label = "slime_2", Hp = 20, Power = 8 },
    new () { Id = 4, Name = "ドラゴン", Label = "dragon_1", Hp = 120, Power = 30 }
};
// DatabaseBuilderを使ってバイナリデータを生成する
var databaseBuilder = new DatabaseBuilder();
databaseBuilder.Append(enemies);
var binary = databaseBuilder.Build();

// MemoryDatabaseでバイナリから読み込む
var memoryDatabase = new MemoryDatabase(binary, maxDegreeOfParallelism: Environment.ProcessorCount);

// テーブルからデータを検索
var slime1Param = memoryDatabase.EnemyTable.FindByLabel("slime_1");
```

EnemyTableの実装にジャンプして、SourceGeneratorが出力するコードを読んでみます。

```cs
// EnemyTableクラスの抜粋
public sealed partial class EnemyTable : TableBase<Enemy>, ITableUniqueValidate
{
    public Func<Enemy, int> PrimaryKeySelector => primaryIndexSelector;
    readonly Func<Enemy, int> primaryIndexSelector;

    readonly Enemy[] secondaryIndex0;
    readonly Func<Enemy, string> secondaryIndex0Selector;

    public EnemyTable(Enemy[] sortedData)
         : base(sortedData)
    {
        this.primaryIndexSelector = x => x.Id;
        this.secondaryIndex0Selector = x => x.Label;
        this.secondaryIndex0 = CloneAndSortBy(this.secondaryIndex0Selector, System.StringComparer.Ordinal);
        OnAfterConstruct();
    }

	public Enemy FindByLabel(string key)
	{
	    return FindUniqueCore(secondaryIndex0, secondaryIndex0Selector, System.StringComparer.Ordinal, key, true);
	}
}
```

IDでソートした配列とは別に、セカンダリキーであるラベルでソートした配列をクローンして作るわけですね。こうすればセカンダリキーでの検索も、二分探索で高速にできます。セカンダリキーの数だけ配列をクローンするのは気になりますが、Dictionary.Valuesに対して線形検索するよりはよっぽどマシです。ましてや、ラベルをキーにしたDictionaryを作るよりは遥かに省メモリかつ高速なデータ構築ができるでしょう。

## Dictionaryからの脱却

MasterMemoryを最初から導入すれば、「省メモリ」、「高速なDBロードと構築」、「Dictionaryと同程度の高速な検索」が実現できます。ですが実際MasterMemoryが導入できるか、というとそうではない。MasterMemoryは、マスターデータのシリアライズにMessagePack for C#を使うことを前提としてます。昨今流行りのリメイクやリマスターの開発では、急にMessagePackを使う選択肢は取りにくいです。原作のゲームで開発されたマスターデータのバイナリをそのまま使えた方が移植にかかるコストが下がるからです。

MasterMemoryそのものを使うことはできない。しかし、MasterMemoryが採る「ソート済みの配列を事前に作って高速に検索する」というアプローチは使えます。
試しに、以下のようにマスターデータへアクセスするテーブルクラスを作ってみました。

```cs
public class EnemyTable
{
    private Enemy[] sortById;
    private Enemy[] sortByLabel;

    public EnemyTable(Enemy[] data)
    {
	    sortById = data.OrderBy(x => x.Id, Comparer<int>.Default).ToArray();
	    sortByLabel = data.OrderBy(x => x.Label, StringComparer.Ordinal).ToArray();
    }
    public Enemy FindById(int key)
    {
        // 二分探索で検索
        var lo = 0;
        var hi = sortById.Length - 1;
        while (lo <= hi)
        {
            var mid = (int)(((uint)hi + (uint)lo) >> 1);
            var selected = sortById[mid].Id;
            var found = (selected < key) ? -1 : (selected > key) ? 1 : 0;
            if (found == 0) { return sortById[mid]; }
            if (found < 0) { lo = mid + 1; }
            else { hi = mid - 1; }
        }
        throw new KeyNotFoundException();
    }

    public Enemy FindByLabel(string key)
    {
        // 二分探索で検索
        var comparer = StringComparer.Ordinal;
        int num1 = 0;
        int num2 = sortByLabel.Length - 1;
        while (num1 <= num2)
        {
            int first = num2 + num1 >>> 1;
            int num3 = comparer.Compare(sortByLabel[first].Label, key);
            if (num3 == 0)
                return sortById[first];
            if (num3 < 0)
                num1 = first + 1;
            else
                num2 = first - 1;
        }
        throw new KeyNotFoundException();
    }
}
```

コンストラクタでIDとラベルでソートした配列を作る。IDとラベルで検索する時は、ソート済み配列に対して二分探索で検索する。やっていることはたったこれだけです。

このコードをマスターデータの種類だけ手動で作るのは無理なので、SourceGeneratorなりPythonなりでコード生成の仕組みを作っていけばよいでしょう。

## おわりに

ここまで、MasterMemoryのアプローチを参考に、Dicitonaryを使わないマスターデータを管理する手法の提案を紹介させていただきました。

MasterMemoryは、さらに先に進んだAPIが用意されています。

- 独自のコレクション型`RangeView<T>`を活用した、柔軟な範囲検索
- 複数キーを使う検索
- 近傍検索

RangeViewクラスは、なるほどこういう方法があったか、と非常に参考になりました。値の全件取得で使う`Dictionary<TKey,TValue>.Collection` のような使い勝手の悪いクラスより、遥かに柔軟性に富んでいる。

https://github.com/Cysharp/MasterMemory/blob/master/src/MasterMemory/RangeView.cs

それだけでなく、stringの自動インターン化など、省メモリで高速を実現するC#的ハックの技術が多数詰め込まれています。その上で、非常に使いやすいAPIが提供されているわけですから、そりゃみんな使うわけです。
