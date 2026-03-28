/**
 * SVGホロスコープチャートレンダラー
 * 円形のネイタルチャート、トランジットオーバーレイ、シナストリーバイホイールを描画
 */
class ChartRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.NS = 'http://www.w3.org/2000/svg';
        this.size = 600;
        this.cx = this.size / 2;
        this.cy = this.size / 2;

        // 各リングの半径
        this.R = {
            outerSign: 290,
            innerSign: 250,
            outerDegree: 250,
            innerDegree: 235,
            houseCusp: 230,
            planetRing: 195,
            aspectArea: 160,
            innerCircle: 80,
            transitOuter: 290,
            transitInner: 250,
            transitPlanet: 270
        };

        // 色定義
        this.colors = {
            fire: '#8B2500',
            earth: '#2E5A2E',
            air: '#2E4A6A',
            water: '#1A3A6C',
            fireBg: 'rgba(139,37,0,0.3)',
            earthBg: 'rgba(46,90,46,0.3)',
            airBg: 'rgba(46,74,106,0.3)',
            waterBg: 'rgba(26,58,108,0.3)',
            gold: '#F0C040',
            goldDark: '#A67C00',
            line: 'rgba(255,255,255,0.15)',
            lineStrong: 'rgba(255,255,255,0.3)',
            text: '#ffffff',
            textDim: 'rgba(255,255,255,0.6)',
            conjunction: '#50C878',
            trine: '#4A90D9',
            sextile: '#7BB3F0',
            square: '#D94A4A',
            opposition: '#F07B7B',
            quincunx: '#B088F9',
            bg: '#0a0e1a'
        };

        this.signElements = ['fire', 'earth', 'air', 'water'];

        // SVGパスベースの星座シンボル（正式な占星術グリフ、中心0,0 基準、スケール約±7）
        this.signPaths = [
            // Aries: 牡羊座 — 羊の角（V字の曲線）
            'M-5,6 C-5,0 -3,-4 0,-6 C3,-4 5,0 5,6 M0,-6 L0,4',
            // Taurus: 牡牛座 — 円の上に弧
            'M-5,-6 C-5,-2 -2,0 0,0 C2,0 5,-2 5,-6 M-3,3 A3,3 0 1,0 3,3 A3,3 0 1,0 -3,3',
            // Gemini: 双子座 — IIの形（上下に弧）
            'M-5,-6 C-2,-4 2,-4 5,-6 M-5,6 C-2,4 2,4 5,6 M-2,-6 L-2,6 M2,-6 L2,6',
            // Cancer: 蟹座 — 横向きの69
            'M4,-1 A3,3 0 1,0 -2,-1 M-4,1 A3,3 0 1,1 2,1 M-2,-1 C0,-3 4,-3 4,-1 M2,1 C0,3 -4,3 -4,1',
            // Leo: 獅子座 — 円と獅子の尾
            'M-4,-5 A2.5,2.5 0 1,0 -4,-4.9 M-4,-2.5 C-2,0 0,3 2,5 C4,5 5,4 5,2 C5,0 3,0 3,2',
            // Virgo: 乙女座 — Mの形に下向きループ
            'M-6,2 L-6,-4 C-6,-7 -4,-7 -4,-4 L-4,2 M-4,-4 C-4,-7 -2,-7 -2,-4 L-2,2 M-2,-4 C-2,-7 0,-7 0,-4 L0,2 C0,4 2,6 4,5 M-2,0 L3,0',
            // Libra: 天秤座 — 天秤の皿と台座
            'M-6,5 L6,5 M-6,1 C-6,-3 -2,-5 0,-5 C2,-5 6,-3 6,1 M-6,1 L6,1',
            // Scorpio: 蠍座 — Mに矢の尾
            'M-6,2 L-6,-4 C-6,-7 -4,-7 -4,-4 L-4,2 M-4,-4 C-4,-7 -2,-7 -2,-4 L-2,2 M-2,-4 C-2,-7 0,-7 0,-4 L0,2 L2,0 M0,2 L2,4 L4,2',
            // Sagittarius: 射手座 — 矢（斜め）
            'M-5,6 L5,-6 M5,-6 L1,-6 M5,-6 L5,-2 M-2,1 L2,-3',
            // Capricorn: 山羊座 — 山羊の角とループ尾
            'M-6,-4 L-4,-6 L-2,-4 C-1,-2 0,0 0,2 C0,5 3,6 5,4 C6,2 4,1 3,2 C2,3 2,5 4,6',
            // Aquarius: 水瓶座 — 二本のジグザグ波
            'M-6,-2 L-4,0 L-2,-2 L0,0 L2,-2 L4,0 L6,-2 M-6,2 L-4,4 L-2,2 L0,4 L2,2 L4,4 L6,2',
            // Pisces: 魚座 — 二つの弧と横棒
            'M-6,0 L6,0 M-1,-6 C-5,-5 -6,-2 -6,0 C-6,2 -5,5 -1,6 M1,-6 C5,-5 6,-2 6,0 C6,2 5,5 1,6'
        ];
    }

    /**
     * 度数をSVGの角度に変換（ASCを左=180度に配置）
     */
    _degToAngle(degree, ascendant) {
        return ((270 - (degree - ascendant)) % 360 + 360) % 360;
    }

    /**
     * 角度と半径から座標を計算
     */
    _polarToXY(angleDeg, radius) {
        const rad = (angleDeg - 90) * Math.PI / 180;
        return {
            x: this.cx + radius * Math.cos(rad),
            y: this.cy + radius * Math.sin(rad)
        };
    }

    /**
     * SVG要素を生成
     */
    _el(tag, attrs) {
        const el = document.createElementNS(this.NS, tag);
        for (const [k, v] of Object.entries(attrs)) {
            el.setAttribute(k, v);
        }
        return el;
    }

    /**
     * 円弧のパスを生成
     */
    _arcPath(cx, cy, r, startAngle, endAngle) {
        const start = this._polarToXY(startAngle, r);
        const end = this._polarToXY(endAngle, r);
        let sweep = endAngle - startAngle;
        if (sweep < 0) sweep += 360;
        const largeArc = sweep > 180 ? 1 : 0;
        return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
    }

    /**
     * ネイタルチャートを描画
     */
    renderNatalChart(chartData) {
        const { planets, houses, nodes } = chartData;
        const asc = houses.ascendant;

        // SVGを作成（外周の星座シンボルが見切れないようパディング追加）
        const pad = 20;
        const svg = this._el('svg', {
            viewBox: `${-pad} ${-pad} ${this.size + pad * 2} ${this.size + pad * 2}`,
            xmlns: this.NS,
            class: 'horoscope-chart'
        });

        // 背景
        svg.appendChild(this._el('circle', {
            cx: this.cx, cy: this.cy, r: this.R.outerSign + pad,
            fill: this.colors.bg, stroke: 'none'
        }));

        // 描画レイヤー
        this._drawZodiacWheel(svg, asc);
        this._drawDegreeMarks(svg, asc);
        this._drawHouseCusps(svg, houses, asc);

        // アスペクトライン
        if (chartData.aspects) {
            this._drawAspectLines(svg, chartData.aspects, planets, nodes, asc);
        }

        // 惑星配置
        this._drawPlanets(svg, planets, nodes, houses, asc, this.R.planetRing);

        // 中心円
        svg.appendChild(this._el('circle', {
            cx: this.cx, cy: this.cy, r: this.R.innerCircle,
            fill: this.colors.bg, stroke: this.colors.goldDark, 'stroke-width': '1'
        }));

        // ツールチップ用のグループ
        this._addTooltips(svg, planets, nodes, houses, asc);

        this.container.innerHTML = '';
        this.container.appendChild(svg);
        return svg;
    }

    /**
     * 星座ホイールを描画
     */
    _drawZodiacWheel(svg, asc) {
        // 外枠
        svg.appendChild(this._el('circle', {
            cx: this.cx, cy: this.cy, r: this.R.outerSign,
            fill: 'none', stroke: this.colors.gold, 'stroke-width': '2'
        }));
        svg.appendChild(this._el('circle', {
            cx: this.cx, cy: this.cy, r: this.R.innerSign,
            fill: 'none', stroke: this.colors.goldDark, 'stroke-width': '1'
        }));

        // パス1: セクター背景と区切り線を先に描画
        for (let i = 0; i < 12; i++) {
            const signStart = i * 30;
            const signEnd = (i + 1) * 30;
            const startAngle = this._degToAngle(signStart, asc);
            const endAngle = this._degToAngle(signEnd, asc);
            const elementIndex = i % 4;
            const element = this.signElements[elementIndex];

            // セクター背景
            const bgColor = this.colors[element + 'Bg'];
            const p1 = this._polarToXY(startAngle, this.R.innerSign);
            const p2 = this._polarToXY(startAngle, this.R.outerSign);
            const p3 = this._polarToXY(endAngle, this.R.outerSign);
            const p4 = this._polarToXY(endAngle, this.R.innerSign);

            const sweep = endAngle - startAngle;
            const normalizedSweep = ((sweep % 360) + 360) % 360;
            const largeArc = normalizedSweep > 180 ? 1 : 0;
            const sweepDir = 1;

            const path = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} A ${this.R.outerSign} ${this.R.outerSign} 0 ${largeArc} ${sweepDir} ${p3.x} ${p3.y} L ${p4.x} ${p4.y} A ${this.R.innerSign} ${this.R.innerSign} 0 ${largeArc} ${1 - sweepDir} ${p1.x} ${p1.y} Z`;

            svg.appendChild(this._el('path', {
                d: path, fill: bgColor, stroke: this.colors.goldDark, 'stroke-width': '0.5'
            }));

            // 星座区切り線
            const lineStart = this._polarToXY(startAngle, this.R.innerSign);
            const lineEnd = this._polarToXY(startAngle, this.R.outerSign);
            svg.appendChild(this._el('line', {
                x1: lineStart.x, y1: lineStart.y,
                x2: lineEnd.x, y2: lineEnd.y,
                stroke: this.colors.goldDark, 'stroke-width': '1'
            }));
        }

        // パス2: 星座シンボルを全セクターの上に描画（背景に隠れないように）
        for (let i = 0; i < 12; i++) {
            const signStart = i * 30;
            const midAngle = this._degToAngle(signStart + 15, asc);
            const glyphPos = this._polarToXY(midAngle, (this.R.outerSign + this.R.innerSign) / 2);
            const signGroup = this._el('g', {
                transform: `translate(${glyphPos.x}, ${glyphPos.y}) scale(1.4)`,
                'pointer-events': 'none'
            });
            signGroup.appendChild(this._el('path', {
                d: this.signPaths[i],
                fill: 'none',
                stroke: this.colors.gold,
                'stroke-width': '1.2',
                'stroke-linecap': 'round',
                'stroke-linejoin': 'round',
                opacity: '0.9'
            }));
            svg.appendChild(signGroup);
        }
    }

    /**
     * 度数マーキング
     */
    _drawDegreeMarks(svg, asc) {
        for (let i = 0; i < 360; i += 5) {
            const angle = this._degToAngle(i, asc);
            const isMainTick = i % 10 === 0;
            const innerR = isMainTick ? this.R.innerDegree - 5 : this.R.innerDegree - 3;
            const p1 = this._polarToXY(angle, this.R.innerSign);
            const p2 = this._polarToXY(angle, innerR);
            svg.appendChild(this._el('line', {
                x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y,
                stroke: this.colors.textDim,
                'stroke-width': isMainTick ? '1' : '0.5'
            }));
        }
    }

    /**
     * ハウスカスプ線を描画
     */
    _drawHouseCusps(svg, houses, asc) {
        const cuspCircleR = this.R.houseCusp;

        svg.appendChild(this._el('circle', {
            cx: this.cx, cy: this.cy, r: cuspCircleR,
            fill: 'none', stroke: this.colors.line, 'stroke-width': '0.5'
        }));

        for (let i = 0; i < 12; i++) {
            const angle = this._degToAngle(houses.cusps[i], asc);
            const innerP = this._polarToXY(angle, this.R.innerCircle);
            const outerP = this._polarToXY(angle, this.R.innerSign);

            // ASC(1), DSC(7), MC(10), IC(4)は太い線
            const isAngle = (i === 0 || i === 3 || i === 6 || i === 9);
            svg.appendChild(this._el('line', {
                x1: innerP.x, y1: innerP.y,
                x2: outerP.x, y2: outerP.y,
                stroke: isAngle ? this.colors.gold : this.colors.line,
                'stroke-width': isAngle ? '2' : '0.5',
                'stroke-dasharray': isAngle ? 'none' : '4,4'
            }));

            // アングルのラベル
            if (isAngle) {
                const labels = { 0: 'ASC', 3: 'IC', 6: 'DSC', 9: 'MC' };
                const labelR = this.R.innerSign + 3;
                const labelAngle = angle;
                const labelPos = this._polarToXY(labelAngle, labelR);
                // ラベルは小さく外側に配置しない（星座リングと重なるため内側に）
            }
        }
    }

    /**
     * ハウス番号を描画
     */
    _drawHouseNumbers(svg, houses, asc) {
        for (let i = 0; i < 12; i++) {
            const nextI = (i + 1) % 12;
            let mid = (houses.cusps[i] + houses.cusps[nextI]) / 2;
            if (Math.abs(houses.cusps[nextI] - houses.cusps[i]) > 180) {
                mid = (mid + 180) % 360;
            }
            const angle = this._degToAngle(mid, asc);
            const numR = (this.R.innerCircle + this.R.houseCusp) / 2 - 10;
            const pos = this._polarToXY(angle, numR);
            const numText = this._el('text', {
                x: pos.x, y: pos.y,
                'text-anchor': 'middle', 'dominant-baseline': 'central',
                fill: this.colors.textDim, 'font-size': '11',
                'font-family': 'sans-serif', 'pointer-events': 'none'
            });
            numText.textContent = String(i + 1);
            svg.appendChild(numText);
        }
    }

    /**
     * 惑星を描画（重なり回避あり）
     */
    _drawPlanets(svg, planets, nodes, houses, asc, radius) {
        // 全惑星の位置を収集
        const placements = [];

        for (const [name, data] of Object.entries(planets)) {
            if (!data.success) continue;
            placements.push({
                name: name,
                glyph: data.glyph,
                nameJP: data.nameJP,
                degree: data.totalDegrees,
                retrograde: data.retrograde,
                house: houses ? HouseCalculator.getPlanetHouse(data.totalDegrees, houses.cusps) : 0,
                sign: data.signJP,
                degreeInSign: data.dms ? data.dms.formatted : ''
            });
        }

        // ノード
        if (nodes) {
            for (const [name, data] of Object.entries(nodes)) {
                if (!data.success) continue;
                placements.push({
                    name: name,
                    glyph: data.glyph,
                    nameJP: data.nameJP,
                    degree: data.totalDegrees,
                    retrograde: false,
                    house: houses ? HouseCalculator.getPlanetHouse(data.totalDegrees, houses.cusps) : 0,
                    sign: data.signJP,
                    degreeInSign: data.dms ? data.dms.formatted : ''
                });
            }
        }

        // 角度でソート
        placements.sort((a, b) => a.degree - b.degree);

        // 重なり回避（5度以内の惑星をずらす）
        const minSpacing = 8;
        const adjustedAngles = placements.map(p => this._degToAngle(p.degree, asc));

        for (let pass = 0; pass < 5; pass++) {
            for (let i = 0; i < adjustedAngles.length; i++) {
                for (let j = i + 1; j < adjustedAngles.length; j++) {
                    let diff = adjustedAngles[j] - adjustedAngles[i];
                    if (diff > 180) diff -= 360;
                    if (diff < -180) diff += 360;
                    if (Math.abs(diff) < minSpacing) {
                        const push = (minSpacing - Math.abs(diff)) / 2;
                        if (diff >= 0) {
                            adjustedAngles[i] -= push;
                            adjustedAngles[j] += push;
                        } else {
                            adjustedAngles[i] += push;
                            adjustedAngles[j] -= push;
                        }
                    }
                }
            }
        }

        // 描画
        const g = this._el('g', { class: 'planets-group' });
        placements.forEach((p, idx) => {
            const angle = adjustedAngles[idx];
            const pos = this._polarToXY(angle, radius);

            // 惑星シンボル背景
            g.appendChild(this._el('circle', {
                cx: pos.x, cy: pos.y, r: 12,
                fill: this.colors.bg, stroke: this.colors.gold, 'stroke-width': '1',
                class: 'planet-marker',
                'data-planet': p.name,
                'data-info': `${p.nameJP} ${p.sign} ${p.degreeInSign}${p.retrograde ? ' R' : ''}`
            }));

            // 惑星グリフ
            const glyphEl = this._el('text', {
                x: pos.x, y: pos.y,
                'text-anchor': 'middle', 'dominant-baseline': 'central',
                fill: p.retrograde ? '#FF6B6B' : this.colors.gold,
                'font-size': '14', 'font-family': 'serif',
                'pointer-events': 'none'
            });
            glyphEl.textContent = p.glyph;
            g.appendChild(glyphEl);

            // 逆行マーク
            if (p.retrograde) {
                const rPos = this._polarToXY(angle, radius - 18);
                const rText = this._el('text', {
                    x: rPos.x, y: rPos.y,
                    'text-anchor': 'middle', 'dominant-baseline': 'central',
                    fill: '#FF6B6B', 'font-size': '8', 'font-family': 'sans-serif',
                    'pointer-events': 'none'
                });
                rText.textContent = 'R';
                g.appendChild(rText);
            }

            // 惑星から実際の位置への点線（調整されたものを表示）
            const realAngle = this._degToAngle(p.degree, asc);
            const realPos = this._polarToXY(realAngle, this.R.houseCusp);
            if (Math.abs(angle - realAngle) > 2) {
                g.appendChild(this._el('line', {
                    x1: pos.x, y1: pos.y,
                    x2: realPos.x, y2: realPos.y,
                    stroke: this.colors.textDim, 'stroke-width': '0.5',
                    'stroke-dasharray': '2,2'
                }));
            }
        });
        svg.appendChild(g);

        this._placements = placements;
        this._adjustedAngles = adjustedAngles;
    }

    /**
     * アスペクトラインを描画
     */
    _drawAspectLines(svg, aspects, planets, nodes, asc) {
        const g = this._el('g', { class: 'aspects-group', opacity: '0.7' });
        const r = this.R.aspectArea;

        const allBodies = { ...planets };
        if (nodes) {
            for (const [k, v] of Object.entries(nodes)) {
                allBodies[k] = v;
            }
        }

        for (const aspect of aspects) {
            const p1 = allBodies[aspect.planet1];
            const p2 = allBodies[aspect.planet2];
            if (!p1 || !p2 || !p1.success || !p2.success) continue;

            const angle1 = this._degToAngle(p1.totalDegrees, asc);
            const angle2 = this._degToAngle(p2.totalDegrees, asc);
            const pos1 = this._polarToXY(angle1, r);
            const pos2 = this._polarToXY(angle2, r);

            let color, dasharray, width;
            switch (aspect.aspect) {
                case 'conjunction':
                    color = this.colors.conjunction; dasharray = 'none'; width = 1.5; break;
                case 'trine':
                    color = this.colors.trine; dasharray = 'none'; width = 1.5; break;
                case 'sextile':
                    color = this.colors.sextile; dasharray = '6,3'; width = 1; break;
                case 'square':
                    color = this.colors.square; dasharray = 'none'; width = 1.5; break;
                case 'opposition':
                    color = this.colors.opposition; dasharray = '8,4'; width = 1.5; break;
                case 'quincunx':
                    color = this.colors.quincunx; dasharray = '4,4'; width = 0.8; break;
                default:
                    color = this.colors.textDim; dasharray = '3,3'; width = 0.5;
            }

            const opacity = Math.max(0.3, aspect.orbFactor || 0.5);
            g.appendChild(this._el('line', {
                x1: pos1.x, y1: pos1.y, x2: pos2.x, y2: pos2.y,
                stroke: color, 'stroke-width': width,
                'stroke-dasharray': dasharray, opacity: opacity,
                class: 'aspect-line',
                'data-aspect': `${aspect.planet1} ${aspect.aspect} ${aspect.planet2}`
            }));
        }
        svg.appendChild(g);
    }

    /**
     * ツールチップの設定
     */
    _addTooltips(svg, planets, nodes, houses, asc) {
        // CSSベースのツールチップ（SVG外にdivで配置）
        if (!document.getElementById('chart-tooltip')) {
            const tooltip = document.createElement('div');
            tooltip.id = 'chart-tooltip';
            tooltip.className = 'chart-tooltip';
            document.body.appendChild(tooltip);
        }

        // イベントリスナーはmain.jsで設定
    }

    /**
     * トランジットオーバーレイを描画
     */
    renderTransitOverlay(svg, transitPlanets, natalAsc) {
        const g = this._el('g', { class: 'transit-overlay' });

        // トランジット惑星リング
        const outerR = this.R.outerSign + 35;
        const innerR = this.R.outerSign + 5;

        g.appendChild(this._el('circle', {
            cx: this.cx, cy: this.cy, r: outerR,
            fill: 'none', stroke: 'rgba(100,200,255,0.3)', 'stroke-width': '1'
        }));
        g.appendChild(this._el('circle', {
            cx: this.cx, cy: this.cy, r: innerR,
            fill: 'none', stroke: 'rgba(100,200,255,0.2)', 'stroke-width': '0.5'
        }));

        const planetR = (outerR + innerR) / 2;

        for (const [name, data] of Object.entries(transitPlanets)) {
            if (!data.success) continue;
            const angle = this._degToAngle(data.totalDegrees, natalAsc);
            const pos = this._polarToXY(angle, planetR);

            g.appendChild(this._el('circle', {
                cx: pos.x, cy: pos.y, r: 10,
                fill: 'rgba(0,20,40,0.8)', stroke: 'rgba(100,200,255,0.6)', 'stroke-width': '1'
            }));

            const txt = this._el('text', {
                x: pos.x, y: pos.y,
                'text-anchor': 'middle', 'dominant-baseline': 'central',
                fill: 'rgba(100,200,255,0.9)', 'font-size': '12', 'font-family': 'serif',
                'pointer-events': 'none'
            });
            txt.textContent = data.glyph;
            g.appendChild(txt);
        }

        svg.appendChild(g);
    }

    /**
     * シナストリーバイホイール描画
     */
    renderSynastryChart(chart1Data, chart2Data) {
        const asc = chart1Data.houses.ascendant;

        // シナストリーは外側リングが大きいのでviewBoxを拡張（中心座標はそのまま）
        const pad = 50;
        const svg = this._el('svg', {
            viewBox: `${-pad} ${-pad} ${this.size + pad * 2} ${this.size + pad * 2}`,
            xmlns: this.NS,
            class: 'horoscope-chart synastry-chart'
        });

        svg.appendChild(this._el('circle', {
            cx: this.cx, cy: this.cy, r: this.R.outerSign + 35,
            fill: this.colors.bg, stroke: 'none'
        }));

        // 内側: Person 1
        this._drawZodiacWheel(svg, asc);
        this._drawHouseCusps(svg, chart1Data.houses, asc);
        this._drawPlanets(svg, chart1Data.planets, chart1Data.nodes, chart1Data.houses, asc, this.R.planetRing - 20);

        // 外側: Person 2
        this.renderTransitOverlay(svg, chart2Data.planets, asc);

        // シナストリーアスペクトライン
        if (chart2Data.synastryAspects) {
            this._drawSynastryAspects(svg, chart2Data.synastryAspects,
                chart1Data.planets, chart2Data.planets, asc);
        }

        // 中心円
        svg.appendChild(this._el('circle', {
            cx: this.cx, cy: this.cy, r: this.R.innerCircle,
            fill: this.colors.bg, stroke: this.colors.goldDark, 'stroke-width': '1'
        }));

        this.container.innerHTML = '';
        this.container.appendChild(svg);
        return svg;
    }

    /**
     * シナストリーアスペクトラインを描画
     */
    _drawSynastryAspects(svg, aspects, natal, transit, asc) {
        const g = this._el('g', { class: 'synastry-aspects', opacity: '0.5' });
        const natalR = this.R.aspectArea;
        const transitR = this.R.outerSign + 20;

        for (const aspect of aspects) {
            const p1 = natal[aspect.planet1];
            const p2 = transit[aspect.planet2];
            if (!p1 || !p2 || !p1.success || !p2.success) continue;

            const pos1 = this._polarToXY(this._degToAngle(p1.totalDegrees, asc), natalR);
            const pos2 = this._polarToXY(this._degToAngle(p2.totalDegrees, asc), transitR);

            let color;
            switch (aspect.harmony) {
                case 'harmonious': color = this.colors.trine; break;
                case 'challenging': color = this.colors.square; break;
                default: color = this.colors.conjunction;
            }

            g.appendChild(this._el('line', {
                x1: pos1.x, y1: pos1.y, x2: pos2.x, y2: pos2.y,
                stroke: color, 'stroke-width': '1', 'stroke-dasharray': '4,3',
                opacity: '0.6'
            }));
        }
        svg.appendChild(g);
    }
}

window.ChartRenderer = ChartRenderer;
