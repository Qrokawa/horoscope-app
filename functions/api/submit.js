/**
 * Cloudflare Pages Function - フォーム送信処理
 * POST /api/submit
 * UTAGEへ送信
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
        const pref = data.pref || '';

        // UTAGE送信
        const utageData = new URLSearchParams({
            'mail': email,
            'sei': lastName,
            'mei': firstName,
            'free3': birthdate,
            'pref': pref
        });

        const UTAGE_URL = env.UTAGE_URL || 'https://utage-system.com/r/tw3tELQ6GyrO/store';

        const res = await fetch(UTAGE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (compatible; HoroscopeApp/1.0)'
            },
            body: utageData.toString(),
            redirect: 'manual'
        });

        const success = res.status >= 200 && res.status < 400;

        return new Response(JSON.stringify({
            success: success,
            results: { utage: success }
        }), {
            status: success ? 200 : 500,
            headers: corsHeaders
        });

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
