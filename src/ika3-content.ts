import {updateToken} from "./lib/token_updater";

function generateRandom(length: number) {
    const a2z = Array.from("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")
    const array = new Array(length);
    for (let i = 0; i < length; i++) {
        array[i] = a2z[Math.floor(Math.random() * a2z.length)]
    }
    return array.join("");
}

async function calculateChallenge(codeVerifier: string) {
    const data = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))
    const chars = String.fromCharCode(...Array.from(new Uint8Array(data)))
    return btoa(chars)
        .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function loginFlow() {
    await chrome.storage.local.clear()
    const state = generateRandom(50)
    const codeVerifier = generateRandom(50)
    await chrome.storage.local.set({code_verifier: codeVerifier})
    const codeChallenge = await calculateChallenge(codeVerifier)
    const params = {
        state,
        redirect_uri: "npf71b963c1b7b6d119://auth",
        client_id: "71b963c1b7b6d119",
        response_type: "session_token_code",
        session_token_code_challenge: codeChallenge,
        session_token_code_challenge_method: "S256",
        scope: ["openid", "user", "user.birthday", "user.mii", "user.screenName"].join("%20")
    }
    const p = Object.keys(params)
        .map(x => `${x}=${params[x as unknown as keyof typeof params]}`)
        .join("&")
    window.location.href = `https://accounts.nintendo.com/connect/1.0.0/authorize?${p}`
}


function addButton() {
    const elem = Array.from(document.getElementsByClassName("NavigationBar_exitButton__Q2OHE"))[0]
    console.log(elem)
    if (!elem) return
    (elem as HTMLButtonElement).addEventListener("click", async () => {
        await chrome.storage.local.clear()
        window.location.reload()
    })
}

function initialize() {

    chrome.storage.local.get(items => {
        console.log(items)
        if (typeof items.session_token === "undefined") {
            loginFlow().catch(console.error)
            return
        }
        updateToken(items).catch(console.error)
    })
}


initialize()
addButton()

export {}
