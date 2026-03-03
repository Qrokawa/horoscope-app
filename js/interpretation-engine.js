/**
 * 鑑定テキスト生成エンジン
 * チャートデータからHOROSCOPE_DATAを参照して日本語の鑑定結果を組み立てる
 */
class InterpretationEngine {
    constructor() {
        this.data = window.HOROSCOPE_DATA;
    }

    /**
     * 惑星×星座の解釈を取得
     */
    getPlanetInSign(planet, sign) {
        const key = `${planet}_${sign}`;
        return this.data.planetInSign[key] || null;
    }

    /**
     * 惑星×ハウスの解釈を取得
     */
    getPlanetInHouse(planet, house) {
        const key = `${planet}_${house}`;
        return this.data.planetInHouse[key] || null;
    }

    /**
     * アスペクトの解釈を取得
     */
    getAspectInterpretation(planet1, planet2, aspectType) {
        const key = `${planet1}_${planet2}_${aspectType}`;
        const revKey = `${planet2}_${planet1}_${aspectType}`;
        return this.data.aspects[key] || this.data.aspects[revKey] || null;
    }

    /**
     * ASCの星座解釈を取得
     */
    getAscendantInterpretation(sign) {
        return this.data.ascendantSign[sign] || null;
    }

    /**
     * エレメントバランスの解釈を取得
     */
    getElementBalanceInterpretation(dominantElement) {
        const key = `dominant_${dominantElement.toLowerCase()}`;
        return this.data.elementBalance[key] || this.data.elementBalance.balanced;
    }

    /**
     * クオリティバランスの解釈を取得
     */
    getQualityBalanceInterpretation(dominantQuality) {
        const key = `dominant_${dominantQuality.toLowerCase()}`;
        return this.data.qualityBalance[key] || this.data.qualityBalance.balanced;
    }

    /**
     * 完全な鑑定レポートを生成
     */
    generateFullReport(natalChartData) {
        const { planets, nodes, houses, aspects, balance, dominant } = natalChartData;
        const sections = [];

        // 1. 総合概要
        sections.push(this._generateOverview(planets, houses, balance, dominant));

        // 2. ASC（アセンダント）の解釈
        if (houses && houses.ascendantZodiac) {
            const ascInterp = this.getAscendantInterpretation(houses.ascendantZodiac.sign);
            if (ascInterp) {
                sections.push({
                    id: 'ascendant',
                    title: `アセンダント ${houses.ascendantZodiac.signJP}`,
                    subtitle: '外見・第一印象・人生のアプローチ',
                    icon: 'ASC',
                    content: ascInterp.interpretation,
                    keywords: ascInterp.keywords
                });
            }
        }

        // 3. 太陽星座（本質）
        const sunInterp = this.getPlanetInSign('Sun', planets.Sun.sign);
        if (sunInterp) {
            const sunHouse = this.getPlanetInHouse('Sun', planets.Sun.house);
            sections.push({
                id: 'sun',
                title: `太陽 ${planets.Sun.signJP}`,
                subtitle: '本質・アイデンティティ・人生の目的',
                icon: '\u2609',
                content: sunInterp.interpretation,
                keywords: sunInterp.keywords,
                houseInfo: sunHouse ? `第${planets.Sun.house}ハウス: ${sunHouse.interpretation}` : null
            });
        }

        // 4. 月星座（内面・感情）
        const moonInterp = this.getPlanetInSign('Moon', planets.Moon.sign);
        if (moonInterp) {
            const moonHouse = this.getPlanetInHouse('Moon', planets.Moon.house);
            sections.push({
                id: 'moon',
                title: `月 ${planets.Moon.signJP}`,
                subtitle: '感情・無意識・安心感',
                icon: '\u263D',
                content: moonInterp.interpretation,
                keywords: moonInterp.keywords,
                houseInfo: moonHouse ? `第${planets.Moon.house}ハウス: ${moonHouse.interpretation}` : null
            });
        }

        // 5. 水星（知性・コミュニケーション）
        const mercInterp = this.getPlanetInSign('Mercury', planets.Mercury.sign);
        if (mercInterp) {
            sections.push({
                id: 'mercury',
                title: `水星 ${planets.Mercury.signJP}`,
                subtitle: '知性・コミュニケーション・学習スタイル',
                icon: '\u263F',
                content: mercInterp.interpretation,
                keywords: mercInterp.keywords,
                retrograde: planets.Mercury.retrograde
            });
        }

        // 6. 金星（愛・美・価値観）
        const venusInterp = this.getPlanetInSign('Venus', planets.Venus.sign);
        if (venusInterp) {
            sections.push({
                id: 'venus',
                title: `金星 ${planets.Venus.signJP}`,
                subtitle: '愛情表現・美的感覚・価値観',
                icon: '\u2640',
                content: venusInterp.interpretation,
                keywords: venusInterp.keywords,
                retrograde: planets.Venus.retrograde
            });
        }

        // 7. 火星（行動力・情熱）
        const marsInterp = this.getPlanetInSign('Mars', planets.Mars.sign);
        if (marsInterp) {
            sections.push({
                id: 'mars',
                title: `火星 ${planets.Mars.signJP}`,
                subtitle: '行動パターン・情熱・エネルギー',
                icon: '\u2642',
                content: marsInterp.interpretation,
                keywords: marsInterp.keywords,
                retrograde: planets.Mars.retrograde
            });
        }

        // 8. 木星（幸運・拡大）
        const jupInterp = this.getPlanetInSign('Jupiter', planets.Jupiter.sign);
        if (jupInterp) {
            sections.push({
                id: 'jupiter',
                title: `木星 ${planets.Jupiter.signJP}`,
                subtitle: '幸運・成長・拡大の方向',
                icon: '\u2643',
                content: jupInterp.interpretation,
                keywords: jupInterp.keywords
            });
        }

        // 9. 土星（試練・成熟）
        const satInterp = this.getPlanetInSign('Saturn', planets.Saturn.sign);
        if (satInterp) {
            sections.push({
                id: 'saturn',
                title: `土星 ${planets.Saturn.signJP}`,
                subtitle: '試練・責任・人生の課題',
                icon: '\u2644',
                content: satInterp.interpretation,
                keywords: satInterp.keywords
            });
        }

        // 10. エレメント・クオリティバランス
        sections.push(this._generateBalanceSection(balance));

        // 11. 重要なアスペクト
        sections.push(this._generateAspectSection(aspects));

        // 12. ドミナントプラネット
        sections.push(this._generateDominantSection(dominant, planets));

        return sections.filter(s => s !== null);
    }

    /**
     * 総合概要セクション
     */
    _generateOverview(planets, houses, balance, dominant) {
        const sun = planets.Sun;
        const moon = planets.Moon;
        const asc = houses ? houses.ascendantZodiac : null;

        let overview = `あなたの太陽は${sun.signJP}、月は${moon.signJP}に位置しています。`;
        if (asc) {
            overview += `アセンダントは${asc.signJP}です。`;
        }
        overview += `\n\nエレメントのバランスでは${balance.dominantElement.nameJP}のエレメントが最も強く（${balance.dominantElement.percentage}%）、`;
        overview += `${balance.dominantQuality.nameJP}が支配的です。`;
        overview += `\n\n最も影響力のある天体は${dominant.nameJP}（${dominant.glyph}）で、あなたの人生テーマに深く関わっています。`;

        return {
            id: 'overview',
            title: '総合概要',
            subtitle: `${sun.signJP} / ${moon.signJP}${asc ? ` / ASC ${asc.signJP}` : ''}`,
            icon: '\u2726',
            content: overview,
            isOverview: true
        };
    }

    /**
     * バランスセクション
     */
    _generateBalanceSection(balance) {
        const elementText = this.getElementBalanceInterpretation(balance.dominantElement.name);
        const qualityText = this.getQualityBalanceInterpretation(balance.dominantQuality.name);

        return {
            id: 'balance',
            title: 'エレメント・クオリティバランス',
            subtitle: `${balance.dominantElement.nameJP}のエレメント優勢 / ${balance.dominantQuality.nameJP}優勢`,
            icon: '\u2727',
            content: `${elementText}\n\n${qualityText}`,
            chartData: {
                elements: balance.elementPercentages,
                qualities: balance.qualityPercentages
            }
        };
    }

    /**
     * アスペクトセクション
     */
    _generateAspectSection(aspects) {
        if (!aspects || aspects.length === 0) return null;

        // メジャーアスペクトのみ、上位10件
        const majorAspects = aspects.filter(a => a.type === 'major').slice(0, 10);

        const lines = majorAspects.map(a => {
            const interp = this.getAspectInterpretation(a.planet1, a.planet2, a.aspect);
            const astro = new AstronomyCalculator();
            const name1 = astro.planetNamesJP[a.planet1] || a.planet1;
            const name2 = astro.planetNamesJP[a.planet2] || a.planet2;
            const aspectName = new AspectCalculator().aspectNamesJP[a.aspect] || a.aspect;

            return {
                planets: `${name1} ${a.aspectGlyph || ''} ${name2}`,
                aspect: aspectName,
                orb: `${a.orb}\u00B0`,
                harmony: a.harmony,
                interpretation: interp ? interp.interpretation : ''
            };
        });

        return {
            id: 'aspects',
            title: '主要アスペクト',
            subtitle: '天体間の角度関係',
            icon: '\u25B3',
            aspectList: lines,
            isAspectSection: true
        };
    }

    /**
     * ドミナントプラネットセクション
     */
    _generateDominantSection(dominant, planets) {
        const planetMeanings = {
            Sun: '自己表現とリーダーシップが人生の中心テーマ。自信と創造性で道を切り開きます。',
            Moon: '感情と直感が人生の羅針盤。深い共感力と繊細さがあなたの最大の武器です。',
            Mercury: '知性とコミュニケーションが人生の鍵。言葉の力で世界を変える可能性を秘めています。',
            Venus: '愛と美が人生のテーマ。調和と関係性を通じて、周囲に温かさをもたらします。',
            Mars: '行動力と情熱が人生のエンジン。チャレンジ精神で困難を乗り越える力があります。',
            Jupiter: '成長と拡大が人生のモットー。楽観性と寛大さで大きな成功を掴めます。',
            Saturn: '忍耐と責任が人生の柱。時間をかけた着実な努力が大きな成果を生みます。',
            Uranus: '革新と自由が人生のテーマ。独自の視点で新しい道を切り開くパイオニアです。',
            Neptune: '霊性と創造性が人生の核。直感と想像力で見えない世界とつながります。',
            Pluto: '変容と再生が人生のテーマ。深い洞察力で本質を見抜く力があります。'
        };

        return {
            id: 'dominant',
            title: `支配天体: ${dominant.nameJP}（${dominant.glyph}）`,
            subtitle: 'あなたの人生に最も影響する天体',
            icon: dominant.glyph,
            content: planetMeanings[dominant.planet] || '',
            ranking: dominant.ranking.slice(0, 5)
        };
    }
}

window.InterpretationEngine = InterpretationEngine;
