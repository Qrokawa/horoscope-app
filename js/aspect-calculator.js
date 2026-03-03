/**
 * アスペクト計算エンジン
 * 天体間の角度関係を分析（ネイタル・シナストリー両対応）
 * 既存mars-love/aspect-calculator.jsからブラウザ用に改変
 */
class AspectCalculator {
    constructor() {
        this.majorAspects = {
            conjunction: { angle: 0, orb: 8, harmony: 'neutral', intensity: 100 },
            opposition: { angle: 180, orb: 8, harmony: 'challenging', intensity: 90 },
            trine: { angle: 120, orb: 8, harmony: 'harmonious', intensity: 80 },
            square: { angle: 90, orb: 8, harmony: 'challenging', intensity: 75 },
            sextile: { angle: 60, orb: 6, harmony: 'harmonious', intensity: 60 }
        };

        this.minorAspects = {
            quincunx: { angle: 150, orb: 3, harmony: 'adjusting', intensity: 40 },
            semisextile: { angle: 30, orb: 3, harmony: 'harmonious', intensity: 30 },
            semisquare: { angle: 45, orb: 3, harmony: 'challenging', intensity: 35 },
            sesquiquadrate: { angle: 135, orb: 3, harmony: 'challenging', intensity: 35 }
        };

        this.aspectNamesJP = {
            conjunction: 'コンジャンクション（合）',
            opposition: 'オポジション（衝）',
            trine: 'トライン（三分）',
            square: 'スクエア（矩）',
            sextile: 'セクスタイル（六分）',
            quincunx: 'クインカンクス',
            semisextile: 'セミセクスタイル',
            semisquare: 'セミスクエア',
            sesquiquadrate: 'セスキコードレイト'
        };

        this.aspectGlyphs = {
            conjunction: '\u260C', opposition: '\u260D', trine: '\u25B3',
            square: '\u25A1', sextile: '\u2731',
            quincunx: '\u26BB', semisextile: '\u26BA',
            semisquare: '\u2220', sesquiquadrate: '\u2222'
        };

        this.planetWeights = {
            Sun: 30, Moon: 25, Venus: 20, Mars: 15, Mercury: 10,
            Jupiter: 8, Saturn: 7, Uranus: 3, Neptune: 2, Pluto: 2,
            NorthNode: 5, Ascendant: 25, Midheaven: 20
        };
    }

    /**
     * ネイタルチャート内のアスペクトを計算
     */
    calculateNatalAspects(planets, nodes, houses) {
        const aspects = [];
        const allBodies = {};

        for (const [name, data] of Object.entries(planets)) {
            if (data.success) allBodies[name] = data;
        }
        if (nodes) {
            if (nodes.NorthNode && nodes.NorthNode.success) allBodies['NorthNode'] = nodes.NorthNode;
        }
        if (houses) {
            allBodies['Ascendant'] = {
                totalDegrees: houses.ascendant, success: true,
                planet: 'Ascendant', nameJP: 'ASC'
            };
            allBodies['Midheaven'] = {
                totalDegrees: houses.midheaven, success: true,
                planet: 'Midheaven', nameJP: 'MC'
            };
        }

        const bodyNames = Object.keys(allBodies);
        for (let i = 0; i < bodyNames.length; i++) {
            for (let j = i + 1; j < bodyNames.length; j++) {
                const name1 = bodyNames[i];
                const name2 = bodyNames[j];
                const found = this._findAspects(
                    allBodies[name1], allBodies[name2], name1, name2, true
                );
                aspects.push(...found);
            }
        }

        aspects.sort((a, b) => b.weightedIntensity - a.weightedIntensity);
        return aspects;
    }

    /**
     * シナストリーアスペクトを計算
     */
    calculateSynastryAspects(chart1, chart2) {
        const synastryAspects = [];
        const summary = {
            harmonious: 0, challenging: 0, neutral: 0,
            totalIntensity: 0, keyAspects: []
        };

        const importantCombinations = [
            ['Sun', 'Sun'], ['Sun', 'Moon'], ['Sun', 'Venus'], ['Sun', 'Mars'],
            ['Moon', 'Moon'], ['Moon', 'Venus'], ['Moon', 'Mars'],
            ['Venus', 'Venus'], ['Venus', 'Mars'], ['Mars', 'Mars'],
            ['Sun', 'Mercury'], ['Moon', 'Mercury'], ['Venus', 'Jupiter'],
            ['Sun', 'Jupiter'], ['Moon', 'Jupiter'], ['Sun', 'Saturn'],
            ['Moon', 'Saturn']
        ];

        for (const [p1Name, p2Name] of importantCombinations) {
            const p1 = chart1.planets[p1Name];
            const p2 = chart2.planets[p2Name];
            if (!p1 || !p2 || !p1.success || !p2.success) continue;

            const found = this._findAspects(p1, p2, p1Name, p2Name, false);
            for (const aspect of found) {
                synastryAspects.push(aspect);
                if (aspect.harmony === 'harmonious') summary.harmonious++;
                else if (aspect.harmony === 'challenging') summary.challenging++;
                else summary.neutral++;
                summary.totalIntensity += aspect.weightedIntensity;

                if (aspect.weightedIntensity >= 50) {
                    summary.keyAspects.push({
                        planets: `${aspect.planet1} ${aspect.aspectNameJP} ${aspect.planet2}`,
                        intensity: aspect.weightedIntensity,
                        harmony: aspect.harmony,
                        description: this._generateDescription(aspect)
                    });
                }
            }
        }

        summary.keyAspects.sort((a, b) => b.intensity - a.intensity);

        return {
            aspects: synastryAspects,
            summary: summary,
            compatibility: this._calculateCompatibility(summary)
        };
    }

    /**
     * 2天体間のアスペクトを検出
     */
    _findAspects(body1, body2, name1, name2, includeMinor) {
        const found = [];
        const angleDiff = this._angleDifference(body1.totalDegrees, body2.totalDegrees);

        // メジャーアスペクト
        for (const [aspectName, def] of Object.entries(this.majorAspects)) {
            const orb = Math.abs(angleDiff - def.angle);
            const altOrb = Math.abs(angleDiff - (360 - def.angle));
            const minOrb = Math.min(orb, altOrb);

            if (minOrb <= def.orb) {
                const w1 = this.planetWeights[name1] || 1;
                const w2 = this.planetWeights[name2] || 1;
                const orbFactor = 1 - (minOrb / def.orb);

                found.push({
                    planet1: name1, planet2: name2,
                    aspect: aspectName,
                    aspectNameJP: this.aspectNamesJP[aspectName],
                    aspectGlyph: this.aspectGlyphs[aspectName],
                    exactAngle: def.angle,
                    actualAngle: angleDiff,
                    orb: Math.round(minOrb * 100) / 100,
                    orbFactor: orbFactor,
                    harmony: def.harmony,
                    baseIntensity: def.intensity,
                    weightedIntensity: Math.round(def.intensity * ((w1 + w2) / 2) * orbFactor / 30),
                    type: 'major'
                });
            }
        }

        // マイナーアスペクト
        if (includeMinor || this._isImportantPair(name1, name2)) {
            for (const [aspectName, def] of Object.entries(this.minorAspects)) {
                const orb = Math.abs(angleDiff - def.angle);
                const altOrb = Math.abs(angleDiff - (360 - def.angle));
                const minOrb = Math.min(orb, altOrb);

                if (minOrb <= def.orb) {
                    const w1 = this.planetWeights[name1] || 1;
                    const w2 = this.planetWeights[name2] || 1;
                    const orbFactor = 1 - (minOrb / def.orb);

                    found.push({
                        planet1: name1, planet2: name2,
                        aspect: aspectName,
                        aspectNameJP: this.aspectNamesJP[aspectName],
                        aspectGlyph: this.aspectGlyphs[aspectName],
                        exactAngle: def.angle,
                        actualAngle: angleDiff,
                        orb: Math.round(minOrb * 100) / 100,
                        orbFactor: orbFactor,
                        harmony: def.harmony,
                        baseIntensity: def.intensity,
                        weightedIntensity: Math.round(def.intensity * ((w1 + w2) / 2) * orbFactor / 30),
                        type: 'minor'
                    });
                }
            }
        }

        return found;
    }

    _angleDifference(d1, d2) {
        let diff = Math.abs(d1 - d2);
        if (diff > 180) diff = 360 - diff;
        return diff;
    }

    _isImportantPair(p1, p2) {
        const important = ['Sun', 'Moon', 'Venus', 'Mars', 'Ascendant', 'Midheaven'];
        return important.includes(p1) && important.includes(p2);
    }

    _calculateCompatibility(summary) {
        const total = summary.harmonious + summary.challenging + summary.neutral;
        if (total === 0) return { score: 50, level: 'neutral', description: 'アスペクトが検出されませんでした' };

        const harmonyRatio = summary.harmonious / total;
        const challengeRatio = summary.challenging / total;

        let score = 50 + harmonyRatio * 40 - challengeRatio * 30;
        const avgIntensity = summary.totalIntensity / total;
        if (avgIntensity > 60) {
            score += harmonyRatio > challengeRatio ? 10 : -5;
        }
        score = Math.max(0, Math.min(100, Math.round(score)));

        let level, description;
        if (score >= 80) { level = 'excellent'; description = '天体の配置が非常に調和的で、自然な相性の良さがあります'; }
        else if (score >= 65) { level = 'good'; description = '多くの調和的な側面があり、良好な関係を築けるでしょう'; }
        else if (score >= 50) { level = 'moderate'; description = 'バランスの取れた関係で、お互いに成長できる可能性があります'; }
        else if (score >= 35) { level = 'challenging'; description = '挑戦的な側面が多いですが、努力によって深い絆を築けます'; }
        else { level = 'difficult'; description = '困難な側面が多いですが、理解し合うことで新たな発見があります'; }

        return {
            score, level, description,
            details: {
                totalAspects: total,
                harmonyRatio: Math.round(harmonyRatio * 100),
                challengeRatio: Math.round(challengeRatio * 100),
                averageIntensity: Math.round(avgIntensity)
            }
        };
    }

    _generateDescription(aspect) {
        const descriptions = {
            'Sun-Sun': { conjunction: '基本的な性格や人生観が非常に似ており、深い理解を得られます', trine: '互いの個性を尊重し合い、自然体でいられる関係です', square: '価値観の違いから刺激を受け、成長し合える関係です', opposition: '正反対の魅力を持ち、補完し合える関係です' },
            'Sun-Moon': { conjunction: '一方の本質と他方の感情が完璧に調和します', trine: '互いを自然に理解し、心地よい関係を築けます', square: '感情表現の違いから学び合える関係です', opposition: '異なる感情的ニーズが互いを完成させます' },
            'Moon-Moon': { conjunction: '感情的なリズムや生活パターンが非常に似ています', trine: '互いの気持ちを自然に理解し合えます', square: '感情的な刺激を与え合い、成長できます', opposition: '異なる感情表現が新鮮な魅力となります' },
            'Venus-Mars': { conjunction: '恋愛における理想的な化学反応があります', trine: '愛情と情熱が自然に調和し、魅力的な関係です', square: '刺激的で情熱的な恋愛関係を築けます', opposition: '異なる愛情表現が強い魅力となります' },
            'Venus-Venus': { conjunction: '愛情表現や価値観が非常に似ています', trine: '美的感覚や楽しみ方が調和しています', square: '異なる価値観から新しい魅力を発見できます' },
            'Mars-Mars': { conjunction: '行動パターンや情熱の方向性が一致します', trine: '互いのエネルギーを高め合える関係です', square: '競争しながらも成長し合える刺激的な関係です' }
        };

        const key = `${aspect.planet1}-${aspect.planet2}`;
        const rev = `${aspect.planet2}-${aspect.planet1}`;
        const desc = descriptions[key] || descriptions[rev];
        if (desc && desc[aspect.aspect]) return desc[aspect.aspect];

        const harmonyDesc = {
            harmonious: '調和的で自然な相性', challenging: '刺激的で成長を促す関係',
            neutral: 'ニュートラルな影響', adjusting: '調整が必要だが学びのある関係'
        };
        return harmonyDesc[aspect.harmony] || '特別な天体の関係性があります';
    }
}

window.AspectCalculator = AspectCalculator;
