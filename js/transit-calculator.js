/**
 * トランジット計算エンジン
 * 現在の天体位置を計算し、ネイタルチャートとのトランジットアスペクトを検出
 * 運勢予測ロジック（Swiss Ephemeris版）
 */
class TransitCalculator {
    constructor(sweEngine) {
        this.astro = sweEngine;
        this.aspectCalc = new AspectCalculator();
    }

    /**
     * 現在のトランジット惑星位置を計算
     */
    calculateCurrentTransits() {
        const now = new Date();
        const jd = this.astro.dateToJulianDay(now);
        return this.astro.calculateAllPositions(jd);
    }

    /**
     * 特定日時のトランジットを計算
     */
    calculateTransitsForDate(date) {
        const jd = this.astro.dateToJulianDay(date);
        return this.astro.calculateAllPositions(jd);
    }

    /**
     * ネイタルチャートに対するトランジットアスペクトを計算
     */
    calculateTransitAspects(natalChart, transitPlanets) {
        const aspects = [];
        // トランジットの遅い惑星を優先（影響が大きい）
        const transitPriority = ['Pluto', 'Neptune', 'Uranus', 'Saturn', 'Jupiter', 'Mars', 'Venus', 'Mercury', 'Sun', 'Moon'];
        const natalTargets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Ascendant', 'Midheaven'];

        // ASC/MCをnatal bodiesに追加
        const natalBodies = { ...natalChart.planets };
        if (natalChart.houses) {
            natalBodies['Ascendant'] = {
                totalDegrees: natalChart.houses.ascendant,
                success: true, planet: 'Ascendant', nameJP: 'ASC'
            };
            natalBodies['Midheaven'] = {
                totalDegrees: natalChart.houses.midheaven,
                success: true, planet: 'Midheaven', nameJP: 'MC'
            };
        }

        // トランジットのオーブは狭め
        const transitOrbs = {
            conjunction: 3, opposition: 3, trine: 3, square: 3, sextile: 2
        };

        for (const tPlanet of transitPriority) {
            const tData = transitPlanets[tPlanet];
            if (!tData || !tData.success) continue;

            for (const nTarget of natalTargets) {
                const nData = natalBodies[nTarget];
                if (!nData || !nData.success) continue;

                let angleDiff = Math.abs(tData.totalDegrees - nData.totalDegrees);
                if (angleDiff > 180) angleDiff = 360 - angleDiff;

                for (const [aspectName, def] of Object.entries(this.aspectCalc.majorAspects)) {
                    const orb = transitOrbs[aspectName] || 2;
                    const aspectOrb = Math.abs(angleDiff - def.angle);
                    const altOrb = Math.abs(angleDiff - (360 - def.angle));
                    const minOrb = Math.min(aspectOrb, altOrb);

                    if (minOrb <= orb) {
                        const orbFactor = 1 - (minOrb / orb);
                        aspects.push({
                            transitPlanet: tPlanet,
                            transitPlanetJP: this.astro.planetNamesJP[tPlanet],
                            natalTarget: nTarget,
                            natalTargetJP: this.astro.planetNamesJP[nTarget] || nTarget,
                            aspect: aspectName,
                            aspectNameJP: this.aspectCalc.aspectNamesJP[aspectName],
                            orb: Math.round(minOrb * 100) / 100,
                            orbFactor: orbFactor,
                            harmony: def.harmony,
                            significance: this._getTransitSignificance(tPlanet, nTarget, aspectName),
                            interpretation: this._interpretTransit(tPlanet, nTarget, aspectName)
                        });
                    }
                }
            }
        }

        // 重要度順にソート
        aspects.sort((a, b) => b.significance - a.significance);
        return aspects;
    }

    /**
     * トランジットの重要度を算出
     */
    _getTransitSignificance(transitPlanet, natalTarget, aspect) {
        const planetWeight = {
            Pluto: 10, Neptune: 9, Uranus: 9, Saturn: 8, Jupiter: 7,
            Mars: 5, Venus: 4, Mercury: 3, Sun: 6, Moon: 4
        };
        const targetWeight = {
            Sun: 10, Moon: 9, Ascendant: 9, Midheaven: 8,
            Venus: 6, Mars: 6, Mercury: 5
        };
        const aspectWeight = {
            conjunction: 10, opposition: 8, square: 7, trine: 6, sextile: 5
        };

        return (planetWeight[transitPlanet] || 1) *
               (targetWeight[natalTarget] || 1) *
               (aspectWeight[aspect] || 1) / 10;
    }

    /**
     * トランジットの解釈テキスト
     */
    _interpretTransit(transitPlanet, natalTarget, aspect) {
        const harmonyType = this.aspectCalc.majorAspects[aspect]?.harmony;

        const transitThemes = {
            Pluto: '根本的な変容',
            Neptune: '霊的な目覚めと幻想',
            Uranus: '突然の変化と革新',
            Saturn: '試練と成熟',
            Jupiter: '拡大と幸運',
            Mars: 'エネルギーと行動力',
            Venus: '愛と美と調和',
            Mercury: 'コミュニケーションと思考',
            Sun: '自己表現とバイタリティ',
            Moon: '感情と直感の変動'
        };

        const targetThemes = {
            Sun: 'あなたの本質・アイデンティティ',
            Moon: 'あなたの感情・内面',
            Mercury: 'あなたの知性・コミュニケーション',
            Venus: 'あなたの愛情・価値観',
            Mars: 'あなたの行動力・情熱',
            Ascendant: 'あなたの外見・第一印象',
            Midheaven: 'あなたのキャリア・社会的使命'
        };

        const transitTheme = transitThemes[transitPlanet] || '';
        const targetTheme = targetThemes[natalTarget] || '';

        if (harmonyType === 'harmonious') {
            return `${transitTheme}のエネルギーが${targetTheme}を優しくサポートしています。このトランジットは成長と好機をもたらします。`;
        } else if (harmonyType === 'challenging') {
            return `${transitTheme}のエネルギーが${targetTheme}に緊張をもたらしています。困難を通じて大きな成長が期待できます。`;
        } else {
            return `${transitTheme}のエネルギーが${targetTheme}と強力に融合しています。新たな始まりのサインです。`;
        }
    }

    /**
     * 今日の運勢を生成
     */
    generateDailyFortune(natalChart) {
        const transitPlanets = this.calculateCurrentTransits();
        const transitAspects = this.calculateTransitAspects(natalChart, transitPlanets);

        // 月の現在の星座
        const moonData = transitPlanets.Moon;
        const moonSign = moonData ? moonData.signJP : '';

        // 運勢カテゴリーのスコアリング
        const scores = { love: 50, career: 50, health: 50, overall: 50 };

        for (const aspect of transitAspects) {
            const boost = aspect.harmony === 'harmonious' ? 1 : -1;
            const strength = aspect.orbFactor * 5;

            if (['Venus', 'Mars'].includes(aspect.transitPlanet) ||
                ['Venus', 'Mars', 'Moon'].includes(aspect.natalTarget)) {
                scores.love += boost * strength * 2;
            }
            if (['Saturn', 'Jupiter', 'Sun'].includes(aspect.transitPlanet) ||
                ['Sun', 'Midheaven', 'Saturn'].includes(aspect.natalTarget)) {
                scores.career += boost * strength * 2;
            }
            if (['Mars', 'Sun'].includes(aspect.transitPlanet) ||
                ['Mars', 'Ascendant'].includes(aspect.natalTarget)) {
                scores.health += boost * strength * 2;
            }
            scores.overall += boost * strength;
        }

        for (const key of Object.keys(scores)) {
            scores[key] = Math.max(0, Math.min(100, Math.round(scores[key])));
        }

        const toStars = (score) => Math.max(1, Math.min(5, Math.round(score / 20)));

        const luckyColors = {
            '牡羊座': '赤', '牡牛座': '緑', '双子座': '黄', '蟹座': '銀',
            '獅子座': '金', '乙女座': '紺', '天秤座': 'ピンク', '蠍座': 'ワインレッド',
            '射手座': '紫', '山羊座': 'ブラウン', '水瓶座': 'ターコイズ', '魚座': 'ラベンダー'
        };

        const luckyNumber = moonData ? Math.floor(moonData.degree) % 9 + 1 : 7;
        const keyTransits = transitAspects.slice(0, 3);
        const overallMessage = this._generateFortuneMessage(scores, keyTransits, moonSign);

        return {
            date: new Date().toLocaleDateString('ja-JP'),
            moonSign: moonSign,
            scores: scores,
            stars: {
                love: toStars(scores.love),
                career: toStars(scores.career),
                health: toStars(scores.health),
                overall: toStars(scores.overall)
            },
            luckyColor: luckyColors[moonSign] || 'ゴールド',
            luckyNumber: luckyNumber,
            keyTransits: keyTransits,
            message: overallMessage,
            transitPlanets: transitPlanets,
            allTransitAspects: transitAspects
        };
    }

    /**
     * 運勢メッセージを生成
     */
    _generateFortuneMessage(scores, keyTransits, moonSign) {
        const parts = [];

        if (scores.overall >= 70) {
            parts.push('今日は全体的にエネルギーが高く、積極的に行動するのに適した日です。');
        } else if (scores.overall >= 50) {
            parts.push('今日はバランスの取れた日です。落ち着いて物事を進めましょう。');
        } else {
            parts.push('今日は少し慎重に過ごすのが吉。無理をせず、内面を見つめる時間を大切にしてください。');
        }

        if (moonSign) {
            parts.push(`月は${moonSign}を運行中。`);
        }

        if (scores.love >= 70) {
            parts.push('恋愛面では魅力が増す時期。積極的なコミュニケーションが吉です。');
        } else if (scores.love < 40) {
            parts.push('恋愛面では相手の気持ちに寄り添うことを意識してみてください。');
        }

        if (scores.career >= 70) {
            parts.push('仕事面では新しいチャンスに恵まれるかもしれません。チャレンジ精神を持って。');
        } else if (scores.career < 40) {
            parts.push('仕事面では焦らず着実に進めることが大切です。');
        }

        if (keyTransits.length > 0) {
            const transit = keyTransits[0];
            parts.push(`${transit.transitPlanetJP}が${transit.natalTargetJP}に${transit.aspectNameJP}を形成中。${transit.interpretation}`);
        }

        return parts.join('\n\n');
    }
}

window.TransitCalculator = TransitCalculator;
