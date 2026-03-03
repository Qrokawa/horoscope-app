/**
 * Cloudflare Pages Function - フォーム送信処理
 * POST /api/submit
 * MyASPとUTAGEに二重送信
 */

export async function onRequestPost(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json; charset=utf-8'
    };

    try {
        const data = await request.json();

        // バリデーション
        const requiredFields = ['email', 'lastName', 'firstName'];
        const missingFields = requiredFields.filter(f => !data[f]);
        if (missingFields.length > 0) {
            return new Response(JSON.stringify({
                success: false,
                error: '必須項目が不足しています',
                missing: missingFields
            }), { status: 400, headers: corsHeaders });
        }

        const email = data.email;
        const lastName = data.lastName;
        const firstName = data.firstName;
        const birthdate = data.birthdate || '';
        const sunSign = data.sunSign || '';
        const moonSign = data.moonSign || '';
        const ascSign = data.ascSign || '';
        const year = data.year || '';
        const month = data.month || '';
        const day = data.day || '';

        // MyASP送信
        const myaspData = new URLSearchParams({
            '_method': 'POST',
            'data[User][name1]': lastName,
            'data[User][name2]': firstName,
            'data[User][mail]': email,
            'data[User][free1][year]': year,
            'data[User][free1][month]': month,
            'data[User][free1][day]': day
        });

        // UTAGE送信
        const utageData = new URLSearchParams({
            'sei': lastName,
            'mei': firstName,
            'mail': email,
            'free1': birthdate,
            'free2': sunSign + ' / ' + moonSign + ' / ASC ' + ascSign
        });

        const MYASP_URL = env.MYASP_URL || 'https://m.cheerful-woman.com/p/r/sDCzlOMb';
        const UTAGE_URL = env.UTAGE_URL || 'https://utage-system.com/r/cK5cjS14n6De/store';

        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (compatible; HoroscopeApp/1.0)'
            }
        };

        // 並列送信
        const [myaspResult, utageResult] = await Promise.allSettled([
            fetch(MYASP_URL, { ...fetchOptions, body: myaspData.toString() }),
            fetch(UTAGE_URL, { ...fetchOptions, body: utageData.toString() })
        ]);

        const myaspSuccess = myaspResult.status === 'fulfilled' &&
            myaspResult.value.status >= 200 && myaspResult.value.status < 400;
        const utageSuccess = utageResult.status === 'fulfilled' &&
            utageResult.value.status >= 200 && utageResult.value.status < 400;

        const overallSuccess = myaspSuccess && utageSuccess;
        const partialSuccess = myaspSuccess || utageSuccess;

        const response = {
            success: overallSuccess,
            partial: partialSuccess && !overallSuccess,
            results: { myasp: myaspSuccess, utage: utageSuccess }
        };

        const status = overallSuccess ? 200 : (partialSuccess ? 207 : 500);
        return new Response(JSON.stringify(response), { status, headers: corsHeaders });

    } catch (err) {
        return new Response(JSON.stringify({
            success: false,
            error: 'サーバーエラーが発生しました'
        }), { status: 500, headers: corsHeaders });
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
