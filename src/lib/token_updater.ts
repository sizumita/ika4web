import cookies from "browser-cookies"


export async function updateToken(data: {[p: string]: any}) {
    const session_token = data.session_token
    const expiresAt = data.expiresAt ?? 0
    if (expiresAt > Date.now()) {
        cookies.set("_gtoken", data.access_token, {
            samesite: "Strict"
        })
        return
    }
    console.log("fetching token")
    chrome.runtime.sendMessage({
        action: "get_access_token",
        session_token,
    }, (resp: {status: boolean, reason?: string, access_token?: string, expiresAt?: number}) => {
        if (!resp.status) {
            alert(resp.reason!)
            return
        }
        chrome.storage.local.set({expiresAt: resp.expiresAt!, access_token: resp.access_token!})
            .catch(console.error)

        cookies.set("_gtoken", resp.access_token!, {
            samesite: "Strict"
        })
    })
}
