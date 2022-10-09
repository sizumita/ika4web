const APP_VERSION = "2.3.1"

async function getFToken(id_token: string, hash_method: 1 | 2 = 1) {
    const headers = {
        'User-Agent': 'ika4web/1.0.0',
        'Content-Type': 'application/json; charset=utf-8',
    }
    const payload = {
        'token': id_token,
        'hash_method': hash_method,
    }
    const resp = await fetch("https://api.imink.app/f", {
        body: JSON.stringify(payload),
        headers,
        method: "POST"
    })

    const data = await resp.json()
    return [data.f, data.request_id, data.timestamp]
}

async function getToken(session_token: string) {
    const payload = {
        'client_id': '71b963c1b7b6d119',
        'session_token': session_token,
        'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer-session-token',
    }
    const url = 'https://accounts.nintendo.com/connect/1.0.0/api/token'
    const headers = {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'Content-Type': 'application/json',
        'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 7.1.2; SM-G965N Build/N2G48H)',
    }
    const resp = await fetch(url, {
        body: JSON.stringify(payload),
        headers,
        method: "POST",
    })
    const data = await resp.json()
    return [data.access_token, data.id_token]
}

async function getAccountInfo(access_token: string) {
    const headers = {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'Accept-Language': 'ja-JP',
        'Authorization': "Bearer " + access_token,
        'Content-Type': 'application/json',
        'User-Agent': 'NASDKAPI; Android',
    }
    const resp = await fetch("https://api.accounts.nintendo.com/2.0.0/users/me", {headers})
    return await resp.json()
}

async function login(access_token: string, id_token: string, user_info: any) {
    const url = 'https://api-lp1.znc.srv.nintendo.net/v3/Account/Login'
    const headers = {
        'Accept-Encoding': 'gzip',
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': `com.nintendo.znca/${APP_VERSION}(Android/7.1.2)`,
        'X-Platform': 'Android',
        'X-ProductVersion': APP_VERSION,
    }
    const [f, request_id, timestamp] = await getFToken(id_token)

    const payload = {
        'parameter': {
            'naIdToken': id_token,
            'naCountry': user_info['country'],
            'naBirthday': user_info['birthday'],
            'language': user_info['language'],
            'f': f,
            'timestamp': timestamp,
            'requestId': request_id,
        },
    }

    const resp = await fetch(
        url,
        {
            method: "POST",
            headers,
            body: JSON.stringify(payload)
        }
    )

    const data = await resp.json()
    if (typeof data.result === "undefined") {
        throw new Error(`could not login: ${JSON.stringify(data)}`)
    }

    return data['result']['webApiServerCredential']['accessToken']
}

async function getWebServiceToken(new_access_token: string) {
    const url = 'https://api-lp1.znc.srv.nintendo.net/v2/Game/GetWebServiceToken'
    const headers = {
        'Accept-Encoding': 'gzip',
        'Authorization': `Bearer ${new_access_token}`,
        'Content-Type': 'application/json; charset=utf-8',
        'User-Agent': `com.nintendo.znca/${APP_VERSION}(Android/7.1.2)`,
        'X-Platform': 'Android',
        'X-ProductVersion': APP_VERSION,
    }
    const [f, request_id, timestamp] = await getFToken(new_access_token, 2)

    const payload = {
        'parameter': {
            'id': 4834290508791808,
            'registrationToken': new_access_token,
            'f': f,
            'requestId': request_id,
            'timestamp': timestamp,
        },
    }

    const resp = await fetch(url, {
        method: "POST",
        body: JSON.stringify(payload),
        headers,
    })
    const data = await resp.json()
    if (typeof data.result === "undefined") {
        throw new Error(`could not get token: ${JSON.stringify(data)}`)
    }

    return [data['result']['accessToken'], Date.now() + (data['result']['expiresIn'] * 1000)]
}

async function getAccessToken(session_token: string, sendResponse: (response?: any) => void) {
    const [access_token, id_token] = await getToken(session_token)
    if (typeof access_token === "undefined") {
        await chrome.storage.local.clear()
        sendResponse({
            status: false,
            reason: "could not get access token. please reload this page."
        })
    }
    try {
        const userInfo = await getAccountInfo(access_token)
        const new_access_token = await login(access_token, id_token, userInfo)
        const [accessToken, expiresAt] = await getWebServiceToken(new_access_token)
        sendResponse({
            status: true,
            access_token: accessToken,
            expiresAt
        })
    } catch (e) {
        sendResponse({
            status: false,
            reason: `${e}`
        })
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    (async () => {
        if (!message) {
            sendResponse({
                'status': false,
                'reason': 'message is missing'
            });
        }
        if (message.action === 'get_access_token') {
            await getAccessToken(message.session_token, sendResponse)
        }
    })().catch(console.error)

    return true;
})

export {}
