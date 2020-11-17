/**
 * Return a color for the ChIP target, or undefined if no color is assigned.
 * @param target
 * @returns {string}
 */
function colorForTarget(target) {

    const t = target.toLowerCase();
    if (t.startsWith("h3k4")) {
        return "rgb(0,150,0)"
    } else if (t.startsWith("h3k27")) {
        return "rgb(200,0,0)"
    } else if (t.startsWith("h3k36")) {
        return "rgb(0,0,150)"
    } else if (t.startsWith("h3k9")) {
        return "rgb(100,0,0)"
    } else if (t === "ctcf") {
        return "black"
    } else {
        return undefined;
    }
}

export {colorForTarget}