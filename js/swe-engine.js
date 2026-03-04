/**
 * Swiss Ephemeris WebAssembly ラッパー
 * swisseph-wasm (prolaxu) を使用したプロフェッショナル精度の天体計算
 * JPL DE431エフェメリスに基づく0.001秒角精度
 */
class SweEngine {
    constructor() {
        this.swe = null;
        this.initialized = false;

        // 対応天体
        this.supportedBodies = [
            'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
            'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'
        ];

        // Swiss Ephemeris天体ID
        this.planetIds = {
            Sun: 0, Moon: 1, Mercury: 2, Venus: 3, Mars: 4,
            Jupiter: 5, Saturn: 6, Uranus: 7, Neptune: 8, Pluto: 9
        };

        // 星座名
        this.signNames = [
            'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
            'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
        ];
        this.signNamesJP = [
            '牡羊座', '牡牛座', '双子座', '蟹座', '獅子座', '乙女座',
            '天秤座', '蠍座', '射手座', '山羊座', '水瓶座', '魚座'
        ];

        // 天体名
        this.planetNamesJP = {
            Sun: '太陽', Moon: '月', Mercury: '水星', Venus: '金星', Mars: '火星',
            Jupiter: '木星', Saturn: '土星', Uranus: '天王星', Neptune: '海王星', Pluto: '冥王星',
            NorthNode: '北ノード', SouthNode: '南ノード', Ascendant: 'ASC', Midheaven: 'MC'
        };
        this.planetGlyphs = {
            Sun: '\u2609', Moon: '\u263D', Mercury: '\u263F', Venus: '\u2640', Mars: '\u2642',
            Jupiter: '\u2643', Saturn: '\u2644', Uranus: '\u2645', Neptune: '\u2646', Pluto: '\u2647',
            NorthNode: '\u260A', SouthNode: '\u260B', Ascendant: 'ASC', Midheaven: 'MC'
        };

        // 星座グリフ
        this.signGlyphs = [
            '\u2648', '\u2649', '\u264A', '\u264B', '\u264C', '\u264D',
            '\u264E', '\u264F', '\u2650', '\u2651', '\u2652', '\u2653'
        ];

        // エレメント・クオリティ
        this.elements = ['Fire', 'Earth', 'Air', 'Water'];
        this.elementsJP = { Fire: '火', Earth: '地', Air: '風', Water: '水' };
        this.qualities = ['Cardinal', 'Fixed', 'Mutable'];
        this.qualitiesJP = { Cardinal: '活動宮', Fixed: '不動宮', Mutable: '柔軟宮' };

        // 支配星
        this.rulers = {
            Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
            Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Pluto',
            Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Uranus', Pisces: 'Neptune'
        };

        // タイムゾーンオフセット（既存互換）
        this._timezoneOffsets = {
            'Asia/Tokyo': 9, 'Asia/Shanghai': 8, 'Asia/Seoul': 9,
            'Asia/Kolkata': 5.5, 'Asia/Dubai': 4, 'Asia/Bangkok': 7,
            'Asia/Singapore': 8, 'Asia/Hong_Kong': 8,
            'Europe/London': 0, 'Europe/Paris': 1, 'Europe/Berlin': 1,
            'Europe/Rome': 1, 'Europe/Madrid': 1, 'Europe/Moscow': 3,
            'America/New_York': -5, 'America/Chicago': -6,
            'America/Denver': -7, 'America/Los_Angeles': -8,
            'America/Sao_Paulo': -3, 'America/Mexico_City': -6,
            'Pacific/Auckland': 12, 'Pacific/Honolulu': -10,
            'Australia/Sydney': 10, 'Australia/Melbourne': 10,
            'Africa/Cairo': 2, 'Africa/Johannesburg': 2,
            'UTC': 0
        };
    }

    /**
     * Swiss Ephemeris Wasm を初期化（非同期）
     */
    async init(onProgress) {
        if (this.initialized) return;

        if (onProgress) onProgress('Swiss Ephemerisを読み込み中...');

        const { default: SwissEph } = await import(
            'https://cdn.jsdelivr.net/gh/prolaxu/swisseph-wasm@main/src/swisseph.js'
        );

        this.swe = new SwissEph();
        await this.swe.initSwissEph();

        // Fix prolaxu/swisseph-wasm bug: houses() second definition uses 'string'
        // type for hsys parameter instead of 'number', causing Koch to be ignored.
        // Monkey-patch with correct ccall types.
        const M = this.swe.SweModule;
        if (M && M.ccall && M._malloc && M._free) {
            this.swe.houses = function(julianDay, geoLat, geoLon, houseSystem) {
                var cuspsPtr = M._malloc(13 * 8);
                var ascmcPtr = M._malloc(10 * 8);
                var hsys = typeof houseSystem === 'string' ? houseSystem.charCodeAt(0) : houseSystem;
                M.ccall(
                    'swe_houses', 'number',
                    ['number', 'number', 'number', 'number', 'pointer', 'pointer'],
                    [julianDay, geoLat, geoLon, hsys, cuspsPtr, ascmcPtr]
                );
                var cusps = Float64Array.from(new Float64Array(M.HEAPF64.buffer, cuspsPtr, 13));
                var ascmc = Float64Array.from(new Float64Array(M.HEAPF64.buffer, ascmcPtr, 10));
                M._free(cuspsPtr);
                M._free(ascmcPtr);
                return { cusps: cusps, ascmc: ascmc };
            };
        }

        this.initialized = true;

        if (onProgress) onProgress('天文計算エンジン準備完了');
    }

    /**
     * タイムゾーン名からUTCオフセット（時間）を取得
     */
    getTimezoneOffset(timezoneName) {
        return this._timezoneOffsets[timezoneName] !== undefined
            ? this._timezoneOffsets[timezoneName] : 9;
    }

    /**
     * 黄経を星座情報に変換
     */
    eclipticToZodiac(eclipticLongitude) {
        const normalized = ((eclipticLongitude % 360) + 360) % 360;
        const signIndex = Math.floor(normalized / 30);
        const degreeInSign = normalized % 30;
        return {
            sign: this.signNames[signIndex],
            signJP: this.signNamesJP[signIndex],
            signIndex: signIndex,
            degree: degreeInSign,
            totalDegrees: normalized,
            dms: this.decimalToDMS(degreeInSign),
            element: this.elements[signIndex % 4],
            elementJP: this.elementsJP[this.elements[signIndex % 4]],
            quality: this.qualities[signIndex % 3],
            qualityJP: this.qualitiesJP[this.qualities[signIndex % 3]],
            ruler: this.rulers[this.signNames[signIndex]],
            signGlyph: this.signGlyphs[signIndex]
        };
    }

    /**
     * 度数を度分秒に変換
     */
    decimalToDMS(decimal) {
        const degrees = Math.floor(decimal);
        const minutes = Math.floor((decimal - degrees) * 60);
        const seconds = Math.round(((decimal - degrees) * 60 - minutes) * 60);
        return {
            degrees, minutes, seconds,
            formatted: `${degrees}\u00B0${String(minutes).padStart(2, '0')}'${String(seconds).padStart(2, '0')}"`
        };
    }

    /**
     * 単一天体の位置計算（Swiss Ephemeris使用）
     */
    calculatePlanetPosition(planetName, jd) {
        const planetId = this.planetIds[planetName];
        if (planetId === undefined) {
            return { planet: planetName, error: 'Unknown planet', success: false };
        }

        try {
            // SEFLG_SWIEPH(2) | SEFLG_SPEED(256) = 258
            const result = this.swe.calc_ut(jd, planetId, 258);
            // result: Float64Array [lon, lat, dist, lonSpeed, latSpeed, distSpeed]

            const eclipticLongitude = result[0];
            const speed = result[3];
            const zodiacInfo = this.eclipticToZodiac(eclipticLongitude);

            return {
                planet: planetName,
                nameJP: this.planetNamesJP[planetName],
                glyph: this.planetGlyphs[planetName],
                eclipticLongitude: eclipticLongitude,
                ...zodiacInfo,
                retrograde: (planetName !== 'Sun' && planetName !== 'Moon') ? speed < 0 : false,
                speed: speed,
                success: true
            };
        } catch (error) {
            console.error(`Error calculating ${planetName}:`, error);
            return { planet: planetName, error: error.message, success: false };
        }
    }

    /**
     * 全天体の位置を一括計算
     */
    calculateAllPositions(jd) {
        const planets = {};
        for (const body of this.supportedBodies) {
            planets[body] = this.calculatePlanetPosition(body, jd);
        }
        return planets;
    }

    /**
     * 月のノード計算（真のノード - SE_TRUE_NODE使用）
     */
    calculateLunarNodes(jd) {
        try {
            // SE_TRUE_NODE = 11, SEFLG_SWIEPH | SEFLG_SPEED = 258
            const trueNodeResult = this.swe.calc_ut(jd, 11, 258);
            const northNodeLong = trueNodeResult[0];
            const southNodeLong = (northNodeLong + 180) % 360;

            const northNode = this.eclipticToZodiac(northNodeLong);
            const southNode = this.eclipticToZodiac(southNodeLong);

            return {
                NorthNode: {
                    planet: 'NorthNode',
                    nameJP: this.planetNamesJP.NorthNode,
                    glyph: this.planetGlyphs.NorthNode,
                    eclipticLongitude: northNodeLong,
                    ...northNode,
                    success: true
                },
                SouthNode: {
                    planet: 'SouthNode',
                    nameJP: this.planetNamesJP.SouthNode,
                    glyph: this.planetGlyphs.SouthNode,
                    eclipticLongitude: southNodeLong,
                    ...southNode,
                    success: true
                }
            };
        } catch (error) {
            console.error('Error calculating lunar nodes:', error);
            return { NorthNode: { success: false }, SouthNode: { success: false } };
        }
    }

    /**
     * 逆行チェック（SEFLG_SPEEDの速度データを使用）
     */
    isRetrograde(planetName, jd) {
        if (planetName === 'Sun' || planetName === 'Moon') return false;
        const pos = this.calculatePlanetPosition(planetName, jd);
        return pos.success && pos.speed < 0;
    }

    /**
     * Julian Dayへの変換（Swiss Ephemeris使用）
     */
    dateToJulianDay(date) {
        const y = date.getUTCFullYear();
        const m = date.getUTCMonth() + 1;
        const d = date.getUTCDate();
        const h = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
        return this.swe.julday(y, m, d, h);
    }

    /**
     * 黄道傾斜角の計算（Meeus - ハウス計算用互換）
     */
    calculateObliquity(jd) {
        const T = (jd - 2451545.0) / 36525.0;
        return 23.0 + 26.0 / 60.0 + 21.448 / 3600.0
               - (46.8150 / 3600.0) * T
               - (0.00059 / 3600.0) * T * T
               + (0.001813 / 3600.0) * T * T * T;
    }

    /**
     * 完全な出生チャートデータを計算
     */
    calculateFullChart(year, month, day, hour, minute, latitude, longitude, timezoneName) {
        const tzOffset = this.getTimezoneOffset(timezoneName);

        // Swiss Ephemerisのタイムゾーン変換
        const utc = this.swe.utc_time_zone(year, month, day, hour, minute, 0, tzOffset);

        // Julian Day計算
        const decimalHour = utc.hour + utc.minute / 60 + utc.second / 3600;
        const jd = this.swe.julday(utc.year, utc.month, utc.day, decimalHour);

        // 全惑星位置
        const planets = this.calculateAllPositions(jd);

        // 月のノード（真のノード）
        const nodes = this.calculateLunarNodes(jd);

        return {
            birthData: { year, month, day, hour, minute, latitude, longitude, timezone: timezoneName },
            julianDay: jd,
            planets: planets,
            nodes: nodes,
            obliquity: this.calculateObliquity(jd)
        };
    }

    /**
     * リソース解放
     */
    close() {
        if (this.swe) {
            this.swe.close();
            this.swe = null;
            this.initialized = false;
        }
    }
}

// グローバルに公開（既存スクリプトとの互換性）
window.SweEngine = SweEngine;
// AstronomyCalculatorの代替として使えるようにエイリアス
window.AstronomyCalculator = SweEngine;
