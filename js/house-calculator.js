/**
 * ハウスシステム計算エンジン
 * プラシーダス方式（主）/ ホールサイン方式（副）
 * Meeus「天文アルゴリズム」に基づく高精度実装
 */
class HouseCalculator {
    constructor() {
        this.DEG = Math.PI / 180;
        this.RAD = 180 / Math.PI;
    }

    /**
     * ハウス計算のメインエントリポイント
     */
    calculateHouses(julianDay, latitude, longitude, obliquity) {
        const lst = this._calculateLST(julianDay, longitude);
        const lstRad = lst * this.DEG;
        const latRad = latitude * this.DEG;
        const epsRad = obliquity * this.DEG;

        // 極地（緯度66度以上）ではホールサインにフォールバック
        if (Math.abs(latitude) > 66) {
            return this._calculateWholeSigns(lst, latRad, epsRad);
        }

        try {
            const result = this._calculatePlacidus(lstRad, latRad, epsRad);
            result.system = 'Placidus';
            return result;
        } catch {
            return this._calculateWholeSigns(lst, latRad, epsRad);
        }
    }

    /**
     * プラシーダスハウスシステム
     */
    _calculatePlacidus(lstRad, latRad, epsRad) {
        // ASC（アセンダント）計算
        const asc = this._calculateASC(lstRad, latRad, epsRad);

        // MC（ミッドヘブン）計算
        const mc = this._calculateMC(lstRad, epsRad);

        // IC = MC + 180°
        const ic = (mc + 180) % 360;

        // DSC = ASC + 180°
        const dsc = (asc + 180) % 360;

        // プラシーダス中間ハウスカスプ計算
        const cusps = new Array(12);
        cusps[0] = asc;      // 第1ハウス
        cusps[3] = ic;       // 第4ハウス
        cusps[6] = dsc;      // 第7ハウス
        cusps[9] = mc;       // 第10ハウス

        // 第11、12ハウス（MCとASCの間を三等分）
        const h11h12 = this._placidusIntermediate(lstRad, latRad, epsRad, mc, asc, 'upper');
        cusps[10] = h11h12[0]; // 第11ハウス
        cusps[11] = h11h12[1]; // 第12ハウス

        // 第2、3ハウス（ASCとICの間を三等分）
        const h2h3 = this._placidusIntermediate(lstRad, latRad, epsRad, asc, ic, 'lower');
        cusps[1] = h2h3[0]; // 第2ハウス
        cusps[2] = h2h3[1]; // 第3ハウス

        // 対向ハウス
        cusps[4] = (cusps[10] + 180) % 360; // 第5ハウス
        cusps[5] = (cusps[11] + 180) % 360; // 第6ハウス
        cusps[7] = (cusps[1] + 180) % 360;  // 第8ハウス
        cusps[8] = (cusps[2] + 180) % 360;  // 第9ハウス

        return {
            ascendant: asc,
            midheaven: mc,
            descendant: dsc,
            imumCoeli: ic,
            cusps: cusps,
            system: 'Placidus'
        };
    }

    /**
     * アセンダント計算
     */
    _calculateASC(lstRad, latRad, epsRad) {
        const sinLST = Math.sin(lstRad);
        const cosLST = Math.cos(lstRad);
        const sinEps = Math.sin(epsRad);
        const cosEps = Math.cos(epsRad);
        const tanLat = Math.tan(latRad);

        const y = -cosLST;
        const x = sinLST * cosEps + tanLat * sinEps;
        let asc = Math.atan2(y, x) * this.RAD;
        asc = ((asc % 360) + 360) % 360;

        return asc;
    }

    /**
     * MC（ミッドヘブン）計算
     */
    _calculateMC(lstRad, epsRad) {
        const tanLST = Math.tan(lstRad);
        const cosEps = Math.cos(epsRad);
        let mc = Math.atan2(tanLST, cosEps) * this.RAD;
        mc = ((mc % 360) + 360) % 360;

        // MCはLSTと同じ象限にあるべき
        const lstDeg = lstRad * this.RAD;
        const lstQuadrant = Math.floor(((lstDeg % 360) + 360) % 360 / 90);
        const mcQuadrant = Math.floor(mc / 90);
        if (lstQuadrant !== mcQuadrant) {
            mc = (mc + 180) % 360;
        }

        return mc;
    }

    /**
     * プラシーダス中間ハウスカスプ（反復法）
     */
    _placidusIntermediate(lstRad, latRad, epsRad, startDeg, endDeg, hemisphere) {
        const results = [];
        const sinEps = Math.sin(epsRad);
        const cosEps = Math.cos(epsRad);
        const tanLat = Math.tan(latRad);

        for (let f = 1; f <= 2; f++) {
            const fraction = f / 3;
            let cusp;

            // 初期推定値: startとendの間の線形補間
            let diff = endDeg - startDeg;
            if (diff < 0) diff += 360;
            let estimate = (startDeg + diff * fraction) % 360;

            // Newton-Raphson反復法
            const maxIter = 50;
            let converged = false;

            for (let iter = 0; iter < maxIter; iter++) {
                const estRad = estimate * this.DEG;
                const sinEst = Math.sin(estRad);
                const cosEst = Math.cos(estRad);

                // プラシーダスの条件式
                const decl = Math.asin(sinEps * sinEst);
                const tanDecl = Math.tan(decl);

                // 半弧の計算
                const cosSA = -tanLat * tanDecl;
                let semiArc;
                if (cosSA >= 1) semiArc = 0;
                else if (cosSA <= -1) semiArc = Math.PI;
                else semiArc = Math.acos(cosSA);

                // RAMC（恒星時の赤経）
                const ramc = lstRad;

                // 赤経の計算
                const ra = Math.atan2(sinEst * cosEps, cosEst);

                // 時角
                let ha = ramc - ra;
                if (hemisphere === 'upper') {
                    // MCからASCへ（上半球）
                    if (ha < 0) ha += 2 * Math.PI;
                    if (ha > Math.PI) ha -= 2 * Math.PI;
                    const target = semiArc * fraction;
                    const error = ha - target;
                    if (Math.abs(error) < 0.0001) { converged = true; break; }
                    estimate -= error * this.RAD * 0.5;
                } else {
                    // ASCからICへ（下半球）
                    ha = -ha;
                    if (ha < 0) ha += 2 * Math.PI;
                    if (ha > Math.PI) ha -= 2 * Math.PI;
                    const target = (Math.PI - semiArc) * fraction + semiArc;
                    const error = ha - target;
                    if (Math.abs(error) < 0.0001) { converged = true; break; }
                    estimate += error * this.RAD * 0.5;
                }

                estimate = ((estimate % 360) + 360) % 360;
            }

            if (!converged) {
                // フォールバック: 均等分割
                cusp = (startDeg + diff * fraction) % 360;
            } else {
                cusp = estimate;
            }

            results.push(((cusp % 360) + 360) % 360);
        }

        return results;
    }

    /**
     * ホールサインハウスシステム（フォールバック）
     */
    _calculateWholeSigns(lstDeg, latRad, epsRad) {
        const lstRad = lstDeg * this.DEG;
        const asc = this._calculateASC(lstRad, latRad, epsRad);
        const mc = this._calculateMC(lstRad, epsRad);

        // ASCの星座の0度が第1ハウスの開始
        const ascSignIndex = Math.floor(asc / 30);
        const cusps = [];
        for (let i = 0; i < 12; i++) {
            cusps[i] = ((ascSignIndex + i) * 30) % 360;
        }

        return {
            ascendant: asc,
            midheaven: mc,
            descendant: (asc + 180) % 360,
            imumCoeli: (mc + 180) % 360,
            cusps: cusps,
            system: 'Whole Sign'
        };
    }

    /**
     * 地方恒星時計算
     */
    _calculateLST(jd, longitude) {
        const T = (jd - 2451545.0) / 36525.0;
        let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0)
                   + 0.000387933 * T * T - T * T * T / 38710000.0;
        gmst = ((gmst % 360) + 360) % 360;
        let lst = gmst + longitude;
        return ((lst % 360) + 360) % 360;
    }

    /**
     * 惑星がどのハウスに入っているか判定
     */
    getPlanetHouse(planetDegree, cusps) {
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
