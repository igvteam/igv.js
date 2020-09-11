import $ from "../vendor/jquery-3.3.1.slim.js";

const getMouseXY = (domElement, { clientX, clientY }) => {

    // a DOMRect object with eight properties: left, top, right, bottom, x, y, width, height
    const { left, top, width, height } = domElement.getBoundingClientRect();

    return { x: clientX - left,  y: clientY - top, xNormalized: (clientX - left)/width, yNormalized: (clientY - top)/height, width, height };

};

const relativeDOMBBox = (parentElement, childElement) => {
    const { x: x_p, y: y_p, width: width_p, height: height_p } = parentElement.getBoundingClientRect();
    const { x: x_c, y: y_c, width: width_c, height: height_c } = childElement.getBoundingClientRect();
    return { x: (x_c - x_p), y: (y_c - y_p), width: width_c, height:height_c };
};

function pageCoordinates(e) {

    if (e.type.startsWith("touch")) {
        const touch = e.touches[0];
        return {x: touch.pageX, y: touch.pageY};
    } else {
        return {x: e.pageX, y: e.pageY}
    }
}

/**
 * Translate the mouse coordinates for the event to the coordinates for the given target element
 * @param e
 * @param target
 * @returns {{x: number, y: number}}
 */
function translateMouseCoordinates(e, target) {

    var $target = $(target),
        posx,
        posy;

    if (undefined === $target.offset()) {
        console.log('translateMouseCoordinates - $target.offset() is undefined.');
    }

    const coords = pageCoordinates(e);

    posx = coords.x - $target.offset().left;
    posy = coords.y - $target.offset().top;

    return {x: posx, y: posy}
}


function guid  () {
    return ("0000" + (Math.random() * Math.pow(36, 4) << 0).toString(36)).slice(-4);
}



export { getMouseXY, relativeDOMBBox, pageCoordinates, translateMouseCoordinates, guid}

