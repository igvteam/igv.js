import $ from "./vendor/jquery-3.3.1.slim.js";
import {Icon} from "../node_modules/igv-utils/src/index.js"

function createCheckbox(name, initialState) {

    const $container = $('<div>', {class: 'igv-menu-popup-check-container'});

    const $div = $('<div>');
    $container.append($div);

    const svg = Icon.createIcon('check', (true === initialState ? '#444' : 'transparent'));
    $div.append($(svg));

    const $label = $('<div>'/*, { class: 'igv-some-label-class' }*/);
    $label.text(name);
    $container.append($label);

    return $container;
}

function createIcon(name, color) {
    return $(Icon.createIcon(name, color));
}


export {createIcon, createCheckbox};


