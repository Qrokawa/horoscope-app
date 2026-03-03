/**
 * 相性診断エンジン（シナストリー）
 * 2人のネイタルチャートを比較し、相性を分析
 */
class SynastryEngine {
    constructor() {
        this.natalChart = new NatalChart();
        this.aspectCalc = new AspectCalculator();
    }

    /**
     * 2人の完全な相性診断を実行
     */
    analyze(person1Data, person2Data) {
        // 1. 両者のネイタルチャートを計算
        const chart1 = this.natalChart.calculate(
            person1Data.year, person1Data.month, person1Data.day,
            person1Data.hour, person1Data.minute,
            person1Data.latitude, person1Data.longitude, person1Data.timezone
        );
        const chart2 = this.natalChart.calculate(
            person2Data.year, person2Data.month, person2Data.day,
            person2Data.hour, person2Data.minute,
            person2Data.latitude, person2Data.longitude, person2Data.timezone
        );

        // 2. シナストリーアスペクト計算
        const synastry = this.aspectCalc.calculateSynastryAspects(chart1, chart2);

        // 3. エレメント相性分析
        const elementCompat = this._analyzeElementCompatibility(chart1.balance, chart2.balance);

        // 4. 太陽星座の相性
        const sunCompat = this._analyzeSunSignCompatibility(
            chart1.planets.Sun, chart2.planets.Sun
        );

        // 5. 月星座の相性（感情的相性）
        const moonCompat = this._analyzeMoonCompatibility(
            chart1.planets.Moon, chart2.planets.Moon
        );

        // 6. 金星×火星の相性（恋愛・性的相性）
        const venusMarsCom = this._analyzeVenusMars(chart1.planets, chart2.planets);

        // 7. 総合スコア
        const overallScore = this._calculateOverallScore(
            synastry.compatibility.score, elementCompat.score,
            sunCompat.score, moonCompat.score, venusMarsCom.score
        );

        // 8. テキストレポート生成
        const report = this._generateReport(
            synastry, elementCompat, sunCompat, moonCompat, venusMarsCom, overallScore
        );

        return {
            chart1, chart2,
            synastry,
            elementCompatibility: elementCompat,
            sunCompatibility: sunCompat,
            moonCompatibility: moonCompat,
            venusMarsCompatibility: venusMarsCom,
            overallScore,
            report
        };
    }

    /**
     * エレメントの相性分析
     */
    _analyzeElementCompatibility(balance1, balance2) {
        const e1 = balance1.dominantElement;
        const e2 = balance2.dominantElement;

        const matrix = {
            'Fire-Fire': { score: 85, desc: '同じ情熱とエネルギーを共有。刺激的だが衝突もあり得ます。' },
            'Fire-Earth': { score: 60, desc: '火が地を温め、地が火を安定させる。バランスが鍵です。' },
            'Fire-Air': { score: 90, desc: '風が火を強める最高の組み合わせ。アイデアと行動力が融合。' },
            'Fire-Water': { score: 45, desc: '対立しやすいですが、深い感情と情熱の融合は強力です。' },
            'Earth-Earth': { score: 80, desc: '安定した実用的な関係。着実に信頼を築けます。' },
            'Earth-Air': { score: 55, desc: '異なるアプローチですが、互いを補完できます。' },
            'Earth-Water': { score: 85, desc: '互いを育み合う自然な相性。安心感のある関係。' },
            'Air-Air': { score: 75, desc: '知的で自由な関係。会話が尽きません。' },
            'Air-Water': { score: 65, desc: '感情と理性のバランス。理解し合えれば深い関係に。' },
            'Water-Water': { score: 90, desc: '深い感情的つながり。言葉なくても通じ合えます。' }
        };

        const key = `${e1.name}-${e2.name}`;
        const rev = `${e2.name}-${e1.name}`;
        const result = matrix[key] || matrix[rev] || { score: 50, desc: '' };

        return {
            person1Element: e1,
            person2Element: e2,
            score: result.score,
            description: result.desc
        };
    }

    /**
     * 太陽星座の相性分析
     */
    _analyzeSunSignCompatibility(sun1, sun2) {
        if (!sun1.success || !sun2.success) return { score: 50, description: '' };

        const signOrder = [
            'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
            'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
        ];
        const idx1 = signOrder.indexOf(sun1.sign);
        const idx2 = signOrder.indexOf(sun2.sign);
        let diff = Math.abs(idx1 - idx2);
        if (diff > 6) diff = 12 - diff;

        const compatMap = {
            0: { score: 75, desc: `${sun1.signJP}同士の組み合わせ。同じ性質を共有し深く理解し合えますが、似すぎて刺激が足りないことも。` },
            1: { score: 60, desc: `${sun1.signJP}と${sun2.signJP}は隣り合う星座。異なる視点を持ち、学び合える関係です。` },
            2: { score: 80, desc: `${sun1.signJP}と${sun2.signJP}はセクスタイルの関係。自然な調和があり、協力しやすい相性です。` },
            3: { score: 55, desc: `${sun1.signJP}と${sun2.signJP}はスクエアの関係。刺激的ですが、価値観の違いに注意が必要です。` },
            4: { score: 90, desc: `${sun1.signJP}と${sun2.signJP}はトラインの関係。同じエレメントで最も自然な調和があります。` },
            5: { score: 45, desc: `${sun1.signJP}と${sun2.signJP}はクインカンクスの関係。調整が必要ですが、成長の機会が豊富です。` },
            6: { score: 70, desc: `${sun1.signJP}と${sun2.signJP}はオポジションの関係。正反対の魅力で引き合い、補完し合えます。` }
        };

        const result = compatMap[diff] || { score: 50, desc: '' };
        return { score: result.score, description: result.desc, sign1: sun1.signJP, sign2: sun2.signJP };
    }

    /**
     * 月の相性分析（感情的相性）
     */
    _analyzeMoonCompatibility(moon1, moon2) {
        if (!moon1.success || !moon2.success) return { score: 50, description: '' };

        // 月のエレメント相性
        const moonElements = {
            'Fire-Fire': { score: 75, desc: '感情的にダイナミックで、互いの情熱を高め合います。' },
            'Fire-Earth': { score: 55, desc: '感情表現のスタイルが異なりますが、安定と情熱のバランスを学べます。' },
            'Fire-Air': { score: 80, desc: '感情の共有がスムーズで、楽しい雰囲気を作れます。' },
            'Fire-Water': { score: 45, desc: '感情の波長が異なりますが、深い感情の交流が可能です。' },
            'Earth-Earth': { score: 85, desc: '安心感のある感情的なつながり。穏やかで安定した関係。' },
            'Earth-Air': { score: 50, desc: '感情の処理方法が違いますが、互いの視点から学べます。' },
            'Earth-Water': { score: 90, desc: '深い感情的つながり。互いに癒し合える最高の相性。' },
            'Air-Air': { score: 70, desc: '知的な感情共有。会話を通じて気持ちを伝え合います。' },
            'Air-Water': { score: 55, desc: '感情のギャップがありますが、努力で深い理解に到達できます。' },
            'Water-Water': { score: 95, desc: '言葉を超えた感情的つながり。魂レベルで通じ合います。' }
        };

        const e1 = moon1.element;
        const e2 = moon2.element;
        const key = `${e1}-${e2}`;
        const rev = `${e2}-${e1}`;
        const result = moonElements[key] || moonElements[rev] || { score: 50, desc: '' };

        return {
            score: result.score,
            description: result.desc,
            moon1Sign: moon1.signJP,
            moon2Sign: moon2.signJP
        };
    }

    /**
     * 金星×火星の相性（恋愛・性的相性）
     */
    _analyzeVenusMars(planets1, planets2) {
        const v1 = planets1.Venus;
        const m1 = planets1.Mars;
        const v2 = planets2.Venus;
        const m2 = planets2.Mars;

        if (!v1.success || !m1.success || !v2.success || !m2.success) {
            return { score: 50, description: '' };
        }

        let score = 50;
        const details = [];

        // Person1の金星とPerson2の火星
        const v1m2Diff = this._signDifference(v1.signIndex, m2.signIndex);
        if (v1m2Diff === 0) { score += 20; details.push('金星と火星の合は強い化学反応を示します'); }
        else if (v1m2Diff === 4) { score += 15; details.push('金星と火星のトラインは自然な魅力の調和'); }
        else if (v1m2Diff === 2) { score += 10; details.push('金星と火星のセクスタイルは心地よい引力'); }
        else if (v1m2Diff === 6) { score += 12; details.push('金星と火星のオポジションは磁石のような引力'); }

        // Person2の金星とPerson1の火星
        const v2m1Diff = this._signDifference(v2.signIndex, m1.signIndex);
        if (v2m1Diff === 0) { score += 20; details.push('金星と火星の合による深い情熱的つながり'); }
        else if (v2m1Diff === 4) { score += 15; details.push('相互のトラインが調和的な愛を育みます'); }
        else if (v2m1Diff === 2) { score += 10; }
        else if (v2m1Diff === 6) { score += 12; }

        score = Math.min(100, score);

        return {
            score,
            description: details.length > 0 ? details.join('。') + '。' :
                '金星と火星の配置から、穏やかな愛情関係が期待できます。'
        };
    }

    _signDifference(idx1, idx2) {
        let diff = Math.abs(idx1 - idx2);
        if (diff > 6) diff = 12 - diff;
        return diff;
    }

    /**
     * 総合スコアの算出
     */
    _calculateOverallScore(aspectScore, elementScore, sunScore, moonScore, venusMarsScore) {
        const weighted =
            aspectScore * 0.35 +
            elementScore * 0.15 +
            sunScore * 0.15 +
            moonScore * 0.20 +
            venusMarsScore * 0.15;

        const score = Math.round(weighted);

        let level, description;
        if (score >= 85) {
            level = 'soulmate'; description = '魂レベルでの深いつながり。運命的な出会いの可能性があります。';
        } else if (score >= 75) {
            level = 'excellent'; description = '非常に調和的な相性。自然体で素晴らしい関係を築けます。';
        } else if (score >= 65) {
            level = 'good'; description = '良好な相性。互いの魅力を引き出し合える関係です。';
        } else if (score >= 50) {
            level = 'moderate'; description = 'バランスの取れた相性。努力次第で深い絆を育めます。';
        } else if (score >= 35) {
            level = 'challenging'; description = '成長を促す相性。困難を乗り越えることで強い絆が生まれます。';
        } else {
            level = 'difficult'; description = '挑戦的な相性。互いの違いを理解し尊重することが鍵です。';
        }

        return { score, level, description };
    }

    /**
     * レポート生成
     */
    _generateReport(synastry, elementCompat, sunCompat, moonCompat, venusMarsCom, overall) {
        const sections = [];

        sections.push({
            title: '総合相性',
            score: overall.score,
            level: overall.level,
            text: overall.description
        });

        sections.push({
            title: '太陽星座の相性',
            score: sunCompat.score,
            text: sunCompat.description
        });

        sections.push({
            title: '月の相性（感情面）',
            score: moonCompat.score,
            text: `月は${moonCompat.moon1Sign}と${moonCompat.moon2Sign}。${moonCompat.description}`
        });

        sections.push({
            title: '恋愛・情熱の相性',
            score: venusMarsCom.score,
            text: venusMarsCom.description
        });

        sections.push({
            title: 'エレメントの相性',
            score: elementCompat.score,
            text: `${elementCompat.person1Element.nameJP}のエレメントと${elementCompat.person2Element.nameJP}のエレメント。${elementCompat.description}`
        });

        // キーアスペクト
        if (synastry.summary.keyAspects.length > 0) {
            sections.push({
                title: '重要なアスペクト',
                text: synastry.summary.keyAspects.map(a =>
                    `${a.planets}: ${a.description}`
                ).join('\n')
            });
        }

        return sections;
    }
}

window.SynastryEngine = SynastryEngine;
