async function generateToken(state: string) {
    console.log("generating...")
    chrome.storage.local.get(items => {
        (async () => {
            const code_verifier = items.code_verifier
            if (!code_verifier) {
                console.log("verifier not found!")
                return
            }
            let params = new URLSearchParams()
            params.append('client_id', '71b963c1b7b6d119')
            params.append("session_token_code", state)
            params.append("session_token_code_verifier", code_verifier)

            const url = 'https://accounts.nintendo.com/connect/1.0.0/api/session_token'
            const headers = {
                'Accept': 'application/json',
                'Accept-Encoding': 'gzip',
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'com.nintendo.znca/2.2.0(Android/7.1.2)',
                'X-Platform': 'Android',
                'X-ProductVersion': "2.2.0"
            }
            const response = await fetch(
                url,
                {
                    method: "POST",
                    headers,
                    body: params,
                }
            )
            if (response.status > 399) {
                alert("エラー: " + await response.text())
                return
            }
            const data = await response.json()
            await chrome.storage.local.set({session_token: data.session_token})
            window.location.href = "https://api.lp1.av5ja.srv.nintendo.net"
        })().catch(console.error)
    })
}

function injectButton() {
    const element = document.getElementById("authorize-switch-approval-link")
    if (element === null) return;
    const fake = document.createElement("button")
    fake.setAttribute("class", "c-btn c-btn-primary c-btn-small c-btn-tiny")
    fake.setAttribute("id", "authorize-switch-approval-link")
    fake.setAttribute("data-href", element.getAttribute("href")!)
    fake.appendChild(document.createTextNode("この人にする"))
    fake.addEventListener("click", saveSessionToken)
    element.replaceWith(fake)
}

function saveSessionToken() {
    const element = document.getElementById("authorize-switch-approval-link")
    if (element === null) return;
    const href = element.getAttribute("data-href")!
    const regex = /session_token_code=(?<code>[0-9a-zA-Z._-]+)/
    const token_code = href.match(regex)
    if (token_code === null) return;

    const code = token_code.groups!.code
    generateToken(code).catch(console.error)
}

injectButton()

export {}
