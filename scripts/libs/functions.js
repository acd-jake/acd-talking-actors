
export let localize = key => {
    return game.i18n.localize(key);
};

export function loadScript(url, callback) {
    let script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    script.onload = callback;
    document.head.appendChild(script);
}

export function isModuleActive(modulename) {
    return game.modules.get(modulename)
        && game.modules.get(modulename).active;
}