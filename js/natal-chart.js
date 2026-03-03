/**
 * ネイタルチャート統合エンジン
 * 全計算モジュールを統合し、完全なチャートデータを生成
 * Swiss Ephemeris版
 */
class NatalChart {
    constructor(sweEngine) {
        this.astro = sweEngine;
        this.houseCalc = new HouseCalculator(sweEngine);
        this.aspectCalc = new AspectCalculator();
    }

    /**
     * 完全なネイタルチャートを計算（async）
     */
    async calculate(year, month, day, hour, minute, latitude, longitude, timezoneName) {
        // Swiss Ephemerisが初期化されていなければ初期化
        if (!this.astro.initialized) {
            await this.astro.init();
        }

        // 1. 天体計算の基礎データ
        const chartBase = this.astro.calculateFullChart(
            year, month, day, hour, minute, latitude, longitude, timezoneName
        );

        // 2. ハウス計算（Swiss Ephemeris ネイティブKoch）
        const houses = this.houseCalc.calculateHouses(
            chartBase.julianDay, latitude, longitude
        );

        // 3. 惑星のハウス配置を決定
        for (const [name, data] of Object.entries(chartBase.planets)) {
            if (data.success) {
                data.house = HouseCalculator.getPlanetHouse(data.totalDegrees, houses.cusps);
                data.houseMeaning = HouseCalculator.getHouseMeaning(data.house);
            }
        }

        // ノードのハウス配置
        if (chartBase.nodes) {
            for (const [name, data] of Object.entries(chartBase.nodes)) {
                if (data.success) {
                    data.house = HouseCalculator.getPlanetHouse(data.totalDegrees, houses.cusps);
                    data.houseMeaning = HouseCalculator.getHouseMeaning(data.house);
                }
            }
        }

        // 4. ASC/MCの星座情報を追加
        houses.ascendantZodiac = this.astro.eclipticToZodiac(houses.ascendant);
        houses.midheavenZodiac = this.astro.eclipticToZodiac(houses.midheaven);

        // 5. ネイタルアスペクト計算
        const aspects = this.aspectCalc.calculateNatalAspects(
            chartBase.planets, chartBase.nodes, houses
        );

        // 6. エレメント・クオリティバランス分析
        const balance = this._analyzeBalance(chartBase.planets, houses);

        // 7. ドミナントプラネット分析
        const dominant = this._findDominantPlanet(chartBase.planets, houses, aspects);

        return {
            birthData: chartBase.birthData,
            planets: chartBase.planets,
            nodes: chartBase.nodes,
            houses: houses,
            aspects: aspects,
            balance: balance,
            dominant: dominant,
            julianDay: chartBase.julianDay,
            obliquity: chartBase.obliquity
        };
    }

    /**
     * エレメント・クオリティバランスの分析
     */
    _analyzeBalance(planets, houses) {
        const elements = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
        const qualities = { Cardinal: 0, Fixed: 0, Mutable: 0 };
        const polarities = { Positive: 0, Negative: 0 };

        const weights = {
            Sun: 4, Moon: 4, Mercury: 3, Venus: 3, Mars: 3,
            Jupiter: 2, Saturn: 2, Uranus: 1, Neptune: 1, Pluto: 1
        };

        // 惑星のエレメント・クオリティ
        for (const [name, data] of Object.entries(planets)) {
            if (!data.success || !weights[name]) continue;
            const w = weights[name];
            elements[data.element] += w;
            qualities[data.quality] += w;
            if (['Fire', 'Air'].includes(data.element)) polarities.Positive += w;
            else polarities.Negative += w;
        }

        // ASCのエレメント（大きなウェイト）
        if (houses.ascendantZodiac) {
            elements[houses.ascendantZodiac.element] += 4;
            qualities[houses.ascendantZodiac.quality] += 4;
        }

        // MCのエレメント
        if (houses.midheavenZodiac) {
            elements[houses.midheavenZodiac.element] += 2;
            qualities[houses.midheavenZodiac.quality] += 2;
        }

        // 支配エレメント
        const elementTotal = Object.values(elements).reduce((a, b) => a + b, 0);
        const dominantElement = Object.entries(elements)
            .sort((a, b) => b[1] - a[1])[0];
        const weakestElement = Object.entries(elements)
            .sort((a, b) => a[1] - b[1])[0];

        const qualityTotal = Object.values(qualities).reduce((a, b) => a + b, 0);
        const dominantQuality = Object.entries(qualities)
            .sort((a, b) => b[1] - a[1])[0];

        const elementNamesJP = { Fire: '火', Earth: '地', Air: '風', Water: '水' };
        const qualityNamesJP = { Cardinal: '活動宮', Fixed: '不動宮', Mutable: '柔軟宮' };

        return {
            elements: elements,
            qualities: qualities,
            polarities: polarities,
            dominantElement: {
                name: dominantElement[0],
                nameJP: elementNamesJP[dominantElement[0]],
                score: dominantElement[1],
                percentage: Math.round((dominantElement[1] / elementTotal) * 100)
            },
            weakestElement: {
                name: weakestElement[0],
                nameJP: elementNamesJP[weakestElement[0]],
                score: weakestElement[1],
                percentage: Math.round((weakestElement[1] / elementTotal) * 100)
            },
            dominantQuality: {
                name: dominantQuality[0],
                nameJP: qualityNamesJP[dominantQuality[0]],
                score: dominantQuality[1],
                percentage: Math.round((dominantQuality[1] / qualityTotal) * 100)
            },
            elementPercentages: Object.fromEntries(
                Object.entries(elements).map(([k, v]) => [k, Math.round((v / elementTotal) * 100)])
            ),
            qualityPercentages: Object.fromEntries(
                Object.entries(qualities).map(([k, v]) => [k, Math.round((v / qualityTotal) * 100)])
            )
        };
    }

    /**
     * ドミナントプラネット（最も影響力のある天体）を決定
     */
    _findDominantPlanet(planets, houses, aspects) {
        const scores = {};
        const allNames = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
                         'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

        for (const name of allNames) {
            scores[name] = 0;
            const data = planets[name];
            if (!data || !data.success) continue;

            // ASCの支配星ならボーナス
            if (houses.ascendantZodiac) {
                const ascRuler = this.astro.rulers[houses.ascendantZodiac.sign];
                if (ascRuler === name) scores[name] += 10;
            }

            // MCの支配星ならボーナス
            if (houses.midheavenZodiac) {
                const mcRuler = this.astro.rulers[houses.midheavenZodiac.sign];
                if (mcRuler === name) scores[name] += 7;
            }

            // 本来の星座にいれば（ディグニティ）ボーナス
            for (const [sign, rulerPlanet] of Object.entries(this.astro.rulers)) {
                if (rulerPlanet === name && data.sign === sign) {
                    scores[name] += 5;
                }
            }

            // アングルハウス（1, 4, 7, 10）にいればボーナス
            if ([1, 4, 7, 10].includes(data.house)) scores[name] += 5;

            // アスペクト数に基づくスコア
            for (const aspect of aspects) {
                if (aspect.planet1 === name || aspect.planet2 === name) {
                    scores[name] += aspect.type === 'major' ? 3 : 1;
                }
            }
        }

        const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);

        return {
            planet: sorted[0][0],
            nameJP: this.astro.planetNamesJP[sorted[0][0]],
            glyph: this.astro.planetGlyphs[sorted[0][0]],
            score: sorted[0][1],
            ranking: sorted.map(([name, score]) => ({
                name, nameJP: this.astro.planetNamesJP[name],
                glyph: this.astro.planetGlyphs[name], score
            }))
        };
    }
}

window.NatalChart = NatalChart;
