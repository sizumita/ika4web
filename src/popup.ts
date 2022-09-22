const elem = document.getElementById("logout")!
elem.addEventListener("click", () => {
    chrome.storage.local.clear().finally(() => chrome.tabs.reload())
})

const elem2 = document.getElementById("github")!
elem2.addEventListener("click", () => {
    chrome.tabs.create({
        url: "https://github.com/sizumita/ika4web"
    })
})

export {}
