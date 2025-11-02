import {createIcon} from "./icons.js";

function attachDialogCloseHandlerWithParent(parent, closeHandler) {

    var container = document.createElement("div");
    parent.appendChild(container);
    container.appendChild(createIcon("times"));
    container.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeHandler()
    });
}

function throttle(fn, delay) {
    let last = 0;
    return (...args) => {
        const now = new Date().getTime();
        if (now - last < delay) {
            return;
        }
        last = now;
        return fn(...args);
    };
}

export {attachDialogCloseHandlerWithParent, throttle}
