/**
 * Astronomy Engine ブラウザラッパー
 * NASA JPL精度の天体位置計算
 * CDN: https://cdn.jsdelivr.net/npm/astronomy-engine@2.1.19/astronomy.browser.min.js
 */
class AstronomyCalculator {
    constructor() {
        this.name = 'Astronomy Engine Browser Wrapper';
        this.supportedBodies = [
            'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
            'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'
        ];
        this.signNames = [
            'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
            'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
        ];
        this.signNamesJP = [
            '牡羊座', '牡牛座', '双子座', '蟹座', '獅子座', '乙女座',
            '天秤座', '蠍座', '射手座', '山羊座', '水瓶座', '魚座'
        ];
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
        this.signGlyphs = [
            '\u2648', '\u2649', '\u264A', '\u264B', '\u264C', '\u264D',
            '\u264E', '\u264F', '\u2650', '\u2651', '\u2652', '\u2653'
        ];
        this.elements = ['Fire', 'Earth', 'Air', 'Water'];
        this.elementsJP = { Fire: '火', Earth: '地', Air: '風', Water: '水' };
        this.qualities = ['Cardinal', 'Fixed', 'Mutable'];
        this.qualitiesJP = { Cardinal: '活動宮', Fixed: '不動宮', Mutable: '柔軟宮' };
        this.rulers = {
            Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
            Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Pluto',
            Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Uranus', Pisces: 'Neptune'
        };
    }

    /**
     * 生年月日とタイムゾーンからUTC Dateオブジェクトを生成
     */
    createUTCDate(year, month, day, hour, minute, timezoneOffset) {
        const localMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
        return new Date(localMs - timezoneOffset * 3600000);
    }

    /**
     * タイムゾーン名からオフセット（時間）を取得
     */
    getTimezoneOffset(timezoneName) {
        const offsets = {
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
        return offsets[timezoneName] !== undefined ? offsets[timezoneName] : 9;
    }

    /**
     * 黄道座標を黄道十二宮の座標に変換
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
            glyph: this.signGlyphs[signIndex]
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
     * 単一天体の位置計算
     */
    calculatePlanetPosition(planetName, date) {
        try {
            let eclipticLongitude;

            if (planetName === 'Sun') {
                const sunPos = Astronomy.SunPosition(date);
                eclipticLongitude = sunPos.elon;
            } else if (planetName === 'Moon') {
                const moonPos = Astronomy.GeoMoon(date);
                const moonEcliptic = Astronomy.Ecliptic(moonPos);
                eclipticLongitude = moonEcliptic.elon;
            } else {
                const body = Astronomy.Body[planetName];
                if (!body) {
                    throw new Error(`Unsupported body: ${planetName}`);
                }
                const geoVector = Astronomy.GeoVector(body, date, true);
                const ecliptic = Astronomy.Ecliptic(geoVector);
                eclipticLongitude = ecliptic.elon;
            }

            const zodiacInfo = this.eclipticToZodiac(eclipticLongitude);
            return {
                planet: planetName,
                nameJP: this.planetNamesJP[planetName],
                glyph: this.planetGlyphs[planetName],
                eclipticLongitude: eclipticLongitude,
                ...zodiacInfo,
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
    calculateAllPositions(date) {
        const planets = {};
        for (const body of this.supportedBodies) {
            planets[body] = this.calculatePlanetPosition(body, date);
        }
        return planets;
    }

    /**
     * 月のノード（ドラゴンヘッド/テイル）計算
     */
    calculateLunarNodes(date) {
        try {
            // 月の平均ノード計算
            const jd = this.dateToJulianDay(date);
            const T = (jd - 2451545.0) / 36525.0;

            // 月の平均昇交点黄経（Meeus）
            let omega = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T
                        + T * T * T / 467441.0 - T * T * T * T / 60616000.0;
            omega = ((omega % 360) + 360) % 360;

            const northNode = this.eclipticToZodiac(omega);
            const southNode = this.eclipticToZodiac((omega + 180) % 360);

            return {
                NorthNode: {
                    planet: 'NorthNode',
                    nameJP: this.planetNamesJP.NorthNode,
                    glyph: this.planetGlyphs.NorthNode,
                    eclipticLongitude: omega,
                    ...northNode,
                    success: true
                },
                SouthNode: {
                    planet: 'SouthNode',
                    nameJP: this.planetNamesJP.SouthNode,
                    glyph: this.planetGlyphs.SouthNode,
                    eclipticLongitude: (omega + 180) % 360,
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
     * DateオブジェクトをJulian Dayに変換
     */
    dateToJulianDay(date) {
        const y = date.getUTCFullYear();
        const m = date.getUTCMonth() + 1;
        const d = date.getUTCDate() + date.getUTCHours() / 24
                  + date.getUTCMinutes() / 1440 + date.getUTCSeconds() / 86400;

        let yr = y, mo = m;
        if (mo <= 2) { yr -= 1; mo += 12; }

        const A = Math.floor(yr / 100);
        const B = 2 - A + Math.floor(A / 4);

        return Math.floor(365.25 * (yr + 4716)) + Math.floor(30.6001 * (mo + 1)) + d + B - 1524.5;
    }

    /**
     * 黄道傾斜角の計算（Meeus）
     */
    calculateObliquity(jd) {
        const T = (jd - 2451545.0) / 36525.0;
        const eps0 = 23.0 + 26.0 / 60.0 + 21.448 / 3600.0
                     - (46.8150 / 3600.0) * T
                     - (0.00059 / 3600.0) * T * T
                     + (0.001813 / 3600.0) * T * T * T;
        return eps0;
    }

    /**
     * グリニッジ恒星時の計算
     */
    calculateGMST(jd) {
        const T = (jd - 2451545.0) / 36525.0;
        let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
                   + 0.000387933 * T * T - T * T * T / 38710000.0;
        return ((gmst % 360) + 360) % 360;
    }

    /**
     * 地方恒星時の計算
     */
    calculateLST(jd, longitude) {
        const gmst = this.calculateGMST(jd);
        let lst = gmst + longitude;
        return ((lst % 360) + 360) % 360;
    }

    /**
     * 惑星の逆行チェック
     */
    isRetrograde(planetName, date) {
        if (planetName === 'Sun' || planetName === 'Moon') return false;
        try {
            const dt = 1 / 1440; // 1分
            const date1 = new Date(date.getTime() - dt * 86400000);
            const date2 = new Date(date.getTime() + dt * 86400000);

            const pos1 = this.calculatePlanetPosition(planetName, date1);
            const pos2 = this.calculatePlanetPosition(planetName, date2);

            if (!pos1.success || !pos2.success) return false;

            let diff = pos2.eclipticLongitude - pos1.eclipticLongitude;
            if (diff > 180) diff -= 360;
            if (diff < -180) diff += 360;

            return diff < 0;
        } catch {
            return false;
        }
    }

    /**
     * 完全な出生チャートデータを計算
     */
    calculateFullChart(year, month, day, hour, minute, latitude, longitude, timezoneName) {
        const tzOffset = this.getTimezoneOffset(timezoneName);
        const utcDate = this.createUTCDate(year, month, day, hour, minute, tzOffset);
        const jd = this.dateToJulianDay(utcDate);

        // 全惑星位置
        const planets = this.calculateAllPositions(utcDate);

        // 月のノード
        const nodes = this.calculateLunarNodes(utcDate);

        // 逆行チェック
        for (const [name, data] of Object.entries(planets)) {
            if (data.success) {
                data.retrograde = this.isRetrograde(name, utcDate);
            }
        }

        return {
            birthData: { year, month, day, hour, minute, latitude, longitude, timezone: timezoneName },
            utcDate: utcDate,
            julianDay: jd,
            planets: planets,
            nodes: nodes,
            obliquity: this.calculateObliquity(jd),
            gmst: this.calculateGMST(jd),
            lst: this.calculateLST(jd, longitude)
        };
    }
}

window.AstronomyCalculator = AstronomyCalculator;
