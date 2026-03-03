/**
 * ホロスコープアプリ メインコントローラー
 * 画面遷移、フォーム制御、結果表示の統合管理
 */
(function() {
    'use strict';

    // ===== グローバル変数 =====
    let currentChart = null;
    let currentFortune = null;
    let currentSynastry = null;

    // ===== 初期化 =====
    document.addEventListener('DOMContentLoaded', function() {
        createStars();
        initForm();
        initTabs();
        initTooltip();
        showScreen('screen-intro');
    });

    // ===== 星空アニメーション =====
    function createStars() {
        const field = document.getElementById('star-field');
        if (!field) return;
        for (let i = 0; i < 60; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            star.style.left = Math.random() * 100 + '%';
            star.style.top = Math.random() * 100 + '%';
            field.appendChild(star);
        }
    }

    // ===== 画面遷移 =====
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(function(s) {
            s.classList.remove('active');
        });
        var target = document.getElementById(screenId);
        if (target) {
            target.classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    // ===== フォーム初期化 =====
    function initForm() {
        // 年セレクト（1920〜現在）
        var yearSelect = document.getElementById('birth-year');
        var now = new Date();
        if (yearSelect) {
            for (var y = now.getFullYear(); y >= 1920; y--) {
                var opt = document.createElement('option');
                opt.value = y; opt.textContent = y + '年';
                yearSelect.appendChild(opt);
            }
        }

        // 月セレクト
        var monthSelect = document.getElementById('birth-month');
        if (monthSelect) {
            for (var m = 1; m <= 12; m++) {
                var opt = document.createElement('option');
                opt.value = m; opt.textContent = m + '月';
                monthSelect.appendChild(opt);
            }
        }

        // 日セレクト
        var daySelect = document.getElementById('birth-day');
        if (daySelect) {
            for (var d = 1; d <= 31; d++) {
                var opt = document.createElement('option');
                opt.value = d; opt.textContent = d + '日';
                daySelect.appendChild(opt);
            }
        }

        // 時間セレクト
        var hourSelect = document.getElementById('birth-hour');
        if (hourSelect) {
            var unknownOpt = document.createElement('option');
            unknownOpt.value = '12'; unknownOpt.textContent = '不明（12:00で計算）';
            hourSelect.appendChild(unknownOpt);
            for (var h = 0; h <= 23; h++) {
                var opt = document.createElement('option');
                opt.value = h; opt.textContent = String(h).padStart(2, '0') + ':00';
                hourSelect.appendChild(opt);
            }
        }

        // 分セレクト
        var minuteSelect = document.getElementById('birth-minute');
        if (minuteSelect) {
            for (var mi = 0; mi < 60; mi += 5) {
                var opt = document.createElement('option');
                opt.value = mi; opt.textContent = String(mi).padStart(2, '0') + '分';
                minuteSelect.appendChild(opt);
            }
        }

        // 出生地セレクト
        populateLocationSelect();

        // 地域タイプ切替
        var regionRadios = document.querySelectorAll('input[name="region"]');
        regionRadios.forEach(function(radio) {
            radio.addEventListener('change', function() {
                populateLocationSelect();
            });
        });

        // メインフォーム送信
        var mainForm = document.getElementById('birth-form');
        if (mainForm) {
            mainForm.addEventListener('submit', function(e) {
                e.preventDefault();
                handleDiagnosis();
            });
        }

        // 登録フォーム送信
        var regForm = document.getElementById('registration-form');
        if (regForm) {
            regForm.addEventListener('submit', function(e) {
                e.preventDefault();
                handleRegistration();
            });
        }

        // 相性診断フォーム
        var synForm = document.getElementById('synastry-form');
        if (synForm) {
            synForm.addEventListener('submit', function(e) {
                e.preventDefault();
                handleSynastry();
            });
        }
    }

    function populateLocationSelect() {
        var locationSelect = document.getElementById('birth-location');
        if (!locationSelect) return;
        locationSelect.innerHTML = '<option value="">選択してください</option>';

        var regionType = document.querySelector('input[name="region"]:checked');
        var region = regionType ? regionType.value : 'japan';
        var locations = window.LOCATION_DATA[region] || window.LOCATION_DATA.japan;

        locations.forEach(function(loc) {
            var opt = document.createElement('option');
            opt.value = JSON.stringify({ lat: loc.lat, lng: loc.lng, tz: loc.tz });
            opt.textContent = loc.name;
            locationSelect.appendChild(opt);
        });
    }

    // ===== タブ制御 =====
    function initTabs() {
        document.addEventListener('click', function(e) {
            if (e.target.matches('.tab-nav button')) {
                var tabGroup = e.target.closest('.tab-nav');
                var contentContainer = tabGroup ? tabGroup.nextElementSibling : null;

                // タブボタンのactive切替
                tabGroup.querySelectorAll('button').forEach(function(btn) {
                    btn.classList.remove('active');
                });
                e.target.classList.add('active');

                // コンテンツ切替
                var targetId = e.target.getAttribute('data-tab');
                if (contentContainer) {
                    contentContainer.querySelectorAll('.tab-content').forEach(function(tc) {
                        tc.classList.remove('active');
                    });
                    var targetContent = document.getElementById(targetId);
                    if (targetContent) targetContent.classList.add('active');
                }
            }
        });
    }

    // ===== ツールチップ =====
    function initTooltip() {
        var tooltip = document.createElement('div');
        tooltip.id = 'chart-tooltip';
        tooltip.className = 'chart-tooltip';
        document.body.appendChild(tooltip);

        document.addEventListener('mouseover', function(e) {
            var marker = e.target.closest('.planet-marker');
            if (marker) {
                var info = marker.getAttribute('data-info');
                if (info) {
                    tooltip.textContent = info;
                    tooltip.classList.add('visible');
                    var rect = marker.getBoundingClientRect();
                    tooltip.style.left = rect.left + rect.width / 2 + 'px';
                    tooltip.style.top = rect.top - 40 + 'px';
                }
            }
        });

        document.addEventListener('mouseout', function(e) {
            if (e.target.closest('.planet-marker')) {
                tooltip.classList.remove('visible');
            }
        });
    }

    // ===== 診断実行 =====
    function handleDiagnosis() {
        var year = parseInt(document.getElementById('birth-year').value);
        var month = parseInt(document.getElementById('birth-month').value);
        var day = parseInt(document.getElementById('birth-day').value);
        var hour = parseInt(document.getElementById('birth-hour').value);
        var minute = parseInt(document.getElementById('birth-minute').value) || 0;
        var locationVal = document.getElementById('birth-location').value;

        if (!year || !month || !day || !locationVal) {
            alert('生年月日と出生地を入力してください');
            return;
        }

        var location;
        try { location = JSON.parse(locationVal); } catch(e) {
            alert('出生地を選択してください');
            return;
        }

        // ローディング画面表示
        showScreen('screen-loading');
        updateLoadingText('天体の位置を計算中...');

        // 計算を非同期で実行（UI更新のため）
        setTimeout(function() {
            updateLoadingText('ハウスシステムを算出中...');
            setTimeout(function() {
                updateLoadingText('アスペクトを解析中...');
                setTimeout(function() {
                    updateLoadingText('ホロスコープを描画中...');
                    setTimeout(function() {
                        try {
                            var natalChart = new NatalChart();
                            currentChart = natalChart.calculate(
                                year, month, day, hour, minute,
                                location.lat, location.lng, location.tz
                            );

                            // トランジットも計算
                            var transitCalc = new TransitCalculator();
                            currentFortune = transitCalc.generateDailyFortune(currentChart);

                            displayResults();
                            showScreen('screen-result');
                        } catch (error) {
                            console.error('Calculation error:', error);
                            alert('計算中にエラーが発生しました。入力データを確認してください。');
                            showScreen('screen-intro');
                        }
                    }, 500);
                }, 600);
            }, 500);
        }, 400);
    }

    function updateLoadingText(text) {
        var el = document.getElementById('loading-message');
        if (el) el.textContent = text;
    }

    // ===== 結果表示 =====
    function displayResults() {
        if (!currentChart) return;

        // SVGチャート描画
        var renderer = new ChartRenderer('chart-container');
        renderer.renderNatalChart(currentChart);

        // 天体配置テーブル
        displayPlanetTable();

        // ハウステーブル
        displayHouseTable();

        // アスペクトテーブル
        displayAspectTable();

        // 鑑定テキスト
        displayInterpretation();

        // 運勢表示
        displayFortune();
    }

    function displayPlanetTable() {
        var tbody = document.getElementById('planet-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        var astro = new AstronomyCalculator();
        var planets = currentChart.planets;
        var order = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];

        order.forEach(function(name) {
            var p = planets[name];
            if (!p || !p.success) return;
            var tr = document.createElement('tr');
            if (p.retrograde) tr.classList.add('retrograde');
            tr.innerHTML =
                '<td>' + p.glyph + ' ' + p.nameJP + '</td>' +
                '<td>' + p.signJP + ' ' + (p.dms ? p.dms.formatted : '') + '</td>' +
                '<td>第' + (p.house || '-') + 'ハウス</td>' +
                '<td>' + (p.retrograde ? '<span class="retrograde-badge">R</span>' : '') + '</td>';
            tbody.appendChild(tr);
        });

        // ノード
        if (currentChart.nodes) {
            ['NorthNode', 'SouthNode'].forEach(function(name) {
                var n = currentChart.nodes[name];
                if (!n || !n.success) return;
                var tr = document.createElement('tr');
                tr.innerHTML =
                    '<td>' + n.glyph + ' ' + n.nameJP + '</td>' +
                    '<td>' + n.signJP + ' ' + (n.dms ? n.dms.formatted : '') + '</td>' +
                    '<td>第' + (n.house || '-') + 'ハウス</td>' +
                    '<td></td>';
                tbody.appendChild(tr);
            });
        }

        // ASC/MC
        if (currentChart.houses) {
            var ascZ = currentChart.houses.ascendantZodiac;
            var mcZ = currentChart.houses.midheavenZodiac;
            if (ascZ) {
                var tr = document.createElement('tr');
                tr.innerHTML = '<td>ASC</td><td>' + ascZ.signJP + ' ' + ascZ.dms.formatted + '</td><td>第1ハウス</td><td></td>';
                tbody.appendChild(tr);
            }
            if (mcZ) {
                var tr = document.createElement('tr');
                tr.innerHTML = '<td>MC</td><td>' + mcZ.signJP + ' ' + mcZ.dms.formatted + '</td><td>第10ハウス</td><td></td>';
                tbody.appendChild(tr);
            }
        }
    }

    function displayHouseTable() {
        var tbody = document.getElementById('house-table-body');
        if (!tbody || !currentChart.houses) return;
        tbody.innerHTML = '';

        var astro = new AstronomyCalculator();
        currentChart.houses.cusps.forEach(function(cusp, i) {
            var zodiac = astro.eclipticToZodiac(cusp);
            var meaning = HouseCalculator.getHouseMeaning(i + 1);
            var tr = document.createElement('tr');
            tr.innerHTML =
                '<td>' + meaning.name + '</td>' +
                '<td>' + zodiac.signJP + ' ' + zodiac.dms.formatted + '</td>' +
                '<td>' + meaning.keyword + '</td>';
            tbody.appendChild(tr);
        });
    }

    function displayAspectTable() {
        var container = document.getElementById('aspect-list');
        if (!container || !currentChart.aspects) return;
        container.innerHTML = '';

        var astro = new AstronomyCalculator();
        var aspectCalc = new AspectCalculator();
        var majors = currentChart.aspects.filter(function(a) { return a.type === 'major'; }).slice(0, 15);

        majors.forEach(function(a) {
            var div = document.createElement('div');
            div.className = 'aspect-row aspect-' + a.harmony;
            var n1 = astro.planetNamesJP[a.planet1] || a.planet1;
            var n2 = astro.planetNamesJP[a.planet2] || a.planet2;
            div.innerHTML =
                '<span class="aspect-planets">' + n1 + ' ' + (a.aspectGlyph || '') + ' ' + n2 + '</span>' +
                '<span class="aspect-name">' + (a.aspectNameJP || a.aspect) + '</span>' +
                '<span class="aspect-orb">' + a.orb + '\u00B0</span>';
            container.appendChild(div);
        });
    }

    function displayInterpretation() {
        var container = document.getElementById('interpretation-content');
        if (!container) return;
        container.innerHTML = '';

        var engine = new InterpretationEngine();
        var sections = engine.generateFullReport(currentChart);

        sections.forEach(function(section) {
            var div = document.createElement('div');
            div.className = 'interpretation-section glass-card';
            div.setAttribute('data-section', section.id);

            var html = '<h3 class="interp-title">';
            if (section.icon) html += '<span class="interp-icon">' + section.icon + '</span> ';
            html += section.title + '</h3>';
            if (section.subtitle) html += '<p class="interp-subtitle">' + section.subtitle + '</p>';

            if (section.keywords) {
                var kwText = Array.isArray(section.keywords) ? section.keywords.join(' / ') : section.keywords;
                html += '<div class="interp-keywords">' + kwText + '</div>';
            }

            if (section.content) {
                html += '<div class="interp-text">' + section.content.replace(/\n/g, '<br>') + '</div>';
            }

            if (section.houseInfo) {
                html += '<div class="interp-house-info">' + section.houseInfo + '</div>';
            }

            if (section.retrograde) {
                html += '<div class="retrograde-notice">この天体は逆行中です。内面への深い探求の時期を示しています。</div>';
            }

            // アスペクトセクション
            if (section.isAspectSection && section.aspectList) {
                html += '<div class="interp-aspects">';
                section.aspectList.forEach(function(a) {
                    html += '<div class="aspect-detail aspect-' + a.harmony + '">';
                    html += '<div class="aspect-detail-header">' + a.planets + ' <span class="aspect-detail-name">' + a.aspect + '</span> <span class="aspect-detail-orb">(' + a.orb + ')</span></div>';
                    if (a.interpretation) html += '<p class="aspect-detail-text">' + a.interpretation + '</p>';
                    html += '</div>';
                });
                html += '</div>';
            }

            // バランスチャート
            if (section.chartData) {
                html += renderBalanceChart(section.chartData);
            }

            // ランキング
            if (section.ranking) {
                html += '<div class="planet-ranking">';
                section.ranking.forEach(function(r, idx) {
                    html += '<div class="ranking-item"><span class="ranking-num">' + (idx + 1) + '</span> ' + r.glyph + ' ' + r.nameJP + ' <span class="ranking-score">' + r.score + '</span></div>';
                });
                html += '</div>';
            }

            div.innerHTML = html;
            container.appendChild(div);
        });
    }

    function renderBalanceChart(data) {
        var html = '<div class="balance-chart">';
        var elementNames = { Fire: '火', Earth: '地', Air: '風', Water: '水' };
        var qualityNames = { Cardinal: '活動', Fixed: '不動', Mutable: '柔軟' };

        html += '<div class="balance-section"><h4>エレメントバランス</h4>';
        for (var el in data.elements) {
            var pct = data.elements[el];
            html += '<div class="balance-row"><span class="balance-label">' + elementNames[el] + '</span><div class="balance-bar"><div class="balance-fill element-' + el.toLowerCase() + '" style="width:' + pct + '%"></div></div><span class="balance-value">' + pct + '%</span></div>';
        }
        html += '</div>';

        html += '<div class="balance-section"><h4>クオリティバランス</h4>';
        for (var q in data.qualities) {
            var pct = data.qualities[q];
            html += '<div class="balance-row"><span class="balance-label">' + qualityNames[q] + '</span><div class="balance-bar"><div class="balance-fill quality-' + q.toLowerCase() + '" style="width:' + pct + '%"></div></div><span class="balance-value">' + pct + '%</span></div>';
        }
        html += '</div></div>';
        return html;
    }

    // ===== 運勢表示 =====
    function displayFortune() {
        if (!currentFortune) return;

        var container = document.getElementById('fortune-content');
        if (!container) return;

        var f = currentFortune;
        var html = '';

        html += '<div class="fortune-date">' + f.date + 'の運勢</div>';
        html += '<div class="fortune-moon">月は' + f.moonSign + 'を運行中</div>';

        html += '<div class="fortune-grid">';
        var categories = [
            { key: 'overall', label: '総合運', icon: '\u2605' },
            { key: 'love', label: '恋愛運', icon: '\u2661' },
            { key: 'career', label: '仕事運', icon: '\u2692' },
            { key: 'health', label: '健康運', icon: '\u2695' }
        ];
        categories.forEach(function(cat) {
            html += '<div class="fortune-category glass-card">';
            html += '<div class="fortune-icon">' + cat.icon + '</div>';
            html += '<div class="fortune-label">' + cat.label + '</div>';
            html += '<div class="fortune-stars">';
            for (var s = 1; s <= 5; s++) {
                html += '<span class="fortune-star ' + (s <= f.stars[cat.key] ? 'filled' : '') + '">\u2605</span>';
            }
            html += '</div>';
            html += '<div class="score-bar"><div class="score-fill" style="width:' + f.scores[cat.key] + '%"></div></div>';
            html += '</div>';
        });
        html += '</div>';

        html += '<div class="fortune-lucky glass-card">';
        html += '<div class="lucky-item"><span class="lucky-label">ラッキーカラー</span><span class="lucky-value">' + f.luckyColor + '</span></div>';
        html += '<div class="lucky-item"><span class="lucky-label">ラッキーナンバー</span><span class="lucky-value">' + f.luckyNumber + '</span></div>';
        html += '</div>';

        html += '<div class="fortune-message glass-card"><p>' + f.message.replace(/\n\n/g, '</p><p>') + '</p></div>';

        container.innerHTML = html;
    }

    // ===== 相性診断 =====
    function handleSynastry() {
        var year = parseInt(document.getElementById('syn-year').value);
        var month = parseInt(document.getElementById('syn-month').value);
        var day = parseInt(document.getElementById('syn-day').value);
        var hour = parseInt(document.getElementById('syn-hour').value) || 12;
        var minute = parseInt(document.getElementById('syn-minute').value) || 0;
        var locationVal = document.getElementById('syn-location').value;

        if (!year || !month || !day || !locationVal) {
            alert('お相手の生年月日と出生地を入力してください');
            return;
        }

        var location;
        try { location = JSON.parse(locationVal); } catch(e) {
            alert('出生地を選択してください');
            return;
        }

        try {
            var synEngine = new SynastryEngine();
            var person1 = currentChart.birthData;
            var person2 = {
                year: year, month: month, day: day,
                hour: hour, minute: minute,
                latitude: location.lat, longitude: location.lng, timezone: location.tz
            };
            person1.latitude = person1.latitude || currentChart.birthData.latitude;
            person1.longitude = person1.longitude || currentChart.birthData.longitude;
            person1.timezone = person1.timezone || currentChart.birthData.timezone;

            currentSynastry = synEngine.analyze(person1, person2);
            displaySynastryResult();
        } catch (error) {
            console.error('Synastry error:', error);
            alert('相性診断中にエラーが発生しました。');
        }
    }

    function displaySynastryResult() {
        if (!currentSynastry) return;
        var container = document.getElementById('synastry-result');
        if (!container) return;

        var s = currentSynastry;
        var html = '';

        // 総合スコア
        html += '<div class="synastry-score-section glass-card">';
        html += '<div class="synastry-score"><span class="score-number">' + s.overallScore.score + '</span><span class="score-label">/ 100</span></div>';
        html += '<div class="synastry-level">' + s.overallScore.description + '</div>';
        html += '</div>';

        // カテゴリースコア
        html += '<div class="synastry-categories">';
        s.report.forEach(function(section) {
            html += '<div class="synastry-category glass-card">';
            html += '<h4>' + section.title + '</h4>';
            if (section.score !== undefined) {
                html += '<div class="score-bar"><div class="score-fill" style="width:' + section.score + '%"></div></div>';
                html += '<span class="score-value">' + section.score + '点</span>';
            }
            html += '<p>' + section.text + '</p>';
            html += '</div>';
        });
        html += '</div>';

        // バイホイールチャート
        html += '<div id="synastry-chart-container" class="chart-wrapper"></div>';

        container.innerHTML = html;

        // シナストリーチャート描画
        var chartContainer = document.getElementById('synastry-chart-container');
        if (chartContainer) {
            var renderer = new ChartRenderer('synastry-chart-container');
            renderer.renderSynastryChart(s.chart1, s.chart2);
        }
    }

    // ===== メール登録 =====
    function handleRegistration() {
        var email = document.getElementById('reg-email').value;
        var lastName = document.getElementById('reg-lastname').value;
        var firstName = document.getElementById('reg-firstname').value;

        if (!email || !lastName || !firstName) {
            alert('すべての項目を入力してください');
            return;
        }

        var submitBtn = document.querySelector('#registration-form .btn-primary');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = '送信中...';
        }

        var sunSign = currentChart && currentChart.planets.Sun ? currentChart.planets.Sun.signJP : '';
        var moonSign = currentChart && currentChart.planets.Moon ? currentChart.planets.Moon.signJP : '';
        var ascSign = currentChart && currentChart.houses ? currentChart.houses.ascendantZodiac.signJP : '';
        var bd = currentChart ? currentChart.birthData : {};

        var payload = {
            email: email,
            lastName: lastName,
            firstName: firstName,
            birthdate: bd.year + '/' + bd.month + '/' + bd.day,
            year: bd.year, month: bd.month, day: bd.day,
            sunSign: sunSign, moonSign: moonSign, ascSign: ascSign
        };

        fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                alert('ご登録ありがとうございます！完全版の鑑定書をメールでお届けします。');
                if (submitBtn) {
                    submitBtn.textContent = '登録完了';
                }
            } else {
                throw new Error('送信失敗');
            }
        })
        .catch(function(err) {
            console.error('Registration error:', err);
            alert('送信に失敗しました。もう一度お試しください。');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '無料で登録する';
            }
        });
    }

    // ===== ナビゲーション =====
    window.showScreen = showScreen;

    window.goToTransit = function() {
        showScreen('screen-transit');
        if (currentChart && currentFortune) {
            // トランジットチャートオーバーレイ
            var chartContainer = document.getElementById('transit-chart-container');
            if (chartContainer) {
                var renderer = new ChartRenderer('transit-chart-container');
                var svg = renderer.renderNatalChart(currentChart);
                renderer.renderTransitOverlay(svg, currentFortune.transitPlanets, currentChart.houses.ascendant);
            }
        }
    };

    window.goToSynastry = function() {
        showScreen('screen-synastry');
        // 相性診断フォームの出生地セレクトを初期化
        var synLocation = document.getElementById('syn-location');
        if (synLocation && synLocation.options.length <= 1) {
            var locations = window.LOCATION_DATA.japan;
            locations.forEach(function(loc) {
                var opt = document.createElement('option');
                opt.value = JSON.stringify({ lat: loc.lat, lng: loc.lng, tz: loc.tz });
                opt.textContent = loc.name;
                synLocation.appendChild(opt);
            });
        }

        // 年セレクト
        var synYear = document.getElementById('syn-year');
        if (synYear && synYear.options.length <= 1) {
            var now = new Date();
            for (var y = now.getFullYear(); y >= 1920; y--) {
                var opt = document.createElement('option');
                opt.value = y; opt.textContent = y + '年';
                synYear.appendChild(opt);
            }
        }
    };

    window.goToRegistration = function() {
        showScreen('screen-registration');
    };

    window.resetDiagnosis = function() {
        currentChart = null;
        currentFortune = null;
        currentSynastry = null;
        showScreen('screen-intro');
    };

    window.goBackToResult = function() {
        showScreen('screen-result');
    };

})();
