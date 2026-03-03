/**
 * ハウスシステム計算エンジン
 * Swiss Ephemeris ネイティブ swe.houses() によるコッホ(Koch)方式
 */
class HouseCalculator {
    constructor(sweEngine) {
        this.sweEngine = sweEngine;
        this.swe = sweEngine.swe;
    }

    /**
     * ハウス計算のメインエントリポイント
     * Swiss Ephemeris の swe.houses() を使用
     */
    calculateHouses(julianDay, latitude, longitude) {
        // 極地（緯度66度以上）ではホールサインにフォールバック
        if (Math.abs(latitude) > 66) {
            return this._calculateWithSystem(julianDay, latitude, longitude, 'W', 'Whole Sign');
        }

        try {
            return this._calculateWithSystem(julianDay, latitude, longitude, 'K', 'Koch');
        } catch (error) {
            console.warn('Koch house calculation failed, falling back to Whole Sign:', error);
            return this._calculateWithSystem(julianDay, latitude, longitude, 'W', 'Whole Sign');
        }
    }

    /**
     * 指定したハウスシステムで計算
     * @param {string} systemCode - 'K'=Koch, 'P'=Placidus, 'W'=Whole Sign, etc.
     * @param {string} systemName - 表示用システム名
     */
    _calculateWithSystem(julianDay, latitude, longitude, systemCode, systemName) {
        // swe.houses(jd, lat, lon, system)
        // returns { cusps: Float64Array[13], ascmc: Float64Array[10] }
        // cusps[1]..cusps[12] = 12ハウスカスプ (index 0は未使用)
        // ascmc[0]=ASC, ascmc[1]=MC, ascmc[2]=ARMC, ascmc[3]=Vertex
        const result = this.swe.houses(julianDay, latitude, longitude, systemCode);

        // 1-indexed → 0-indexed 変換
        const cusps = [];
        for (let i = 1; i <= 12; i++) {
            cusps[i - 1] = result.cusps[i];
        }

        const asc = result.ascmc[0];
        const mc = result.ascmc[1];

        return {
            ascendant: asc,
            midheaven: mc,
            descendant: (asc + 180) % 360,
            imumCoeli: (mc + 180) % 360,
            cusps: cusps,
            system: systemName
        };
    }

    /**
     * 惑星がどのハウスに入っているか判定
     */
    static getPlanetHouse(planetDegree, cusps) {
        const deg = ((planetDegree % 360) + 360) % 360;
        for (let i = 0; i < 12; i++) {
            const nextI = (i + 1) % 12;
            let start = cusps[i];
            let end = cusps[nextI];

            if (end < start) {
                // 360度をまたぐ
                if (deg >= start || deg < end) return i + 1;
            } else {
                if (deg >= start && deg < end) return i + 1;
            }
        }
        return 1; // フォールバック
    }

    /**
     * ハウスの意味（日本語）
     */
    static getHouseMeaning(houseNumber) {
        const meanings = {
            1: { name: '第1ハウス', theme: '自己・外見・個性', keyword: 'アイデンティティ' },
            2: { name: '第2ハウス', theme: '金銭・所有・価値観', keyword: '物質的価値' },
            3: { name: '第3ハウス', theme: 'コミュニケーション・学習・兄弟', keyword: '知性と交流' },
            4: { name: '第4ハウス', theme: '家庭・ルーツ・基盤', keyword: '心の居場所' },
            5: { name: '第5ハウス', theme: '創造性・恋愛・子供', keyword: '自己表現' },
            6: { name: '第6ハウス', theme: '健康・仕事・奉仕', keyword: '日常と義務' },
            7: { name: '第7ハウス', theme: 'パートナーシップ・結婚・契約', keyword: '対人関係' },
            8: { name: '第8ハウス', theme: '変容・遺産・深い絆', keyword: '再生と共有' },
            9: { name: '第9ハウス', theme: '哲学・旅行・高等教育', keyword: '精神的探求' },
            10: { name: '第10ハウス', theme: 'キャリア・社会的地位・天職', keyword: '社会的使命' },
            11: { name: '第11ハウス', theme: '友人・グループ・理想', keyword: '未来への希望' },
            12: { name: '第12ハウス', theme: '潜在意識・秘密・霊性', keyword: '魂の領域' }
        };
        return meanings[houseNumber] || meanings[1];
    }
}

window.HouseCalculator = HouseCalculator;
