import IGVGraphics from "../igv-canvas";

function paintAxis(ctx, pixelWidth, pixelHeight) {

    var x1,
        x2,
        y1,
        y2,
        a,
        b,
        reference,
        shim,
        font = {
            'font': 'normal 10px Arial',
            'textAlign': 'right',
            'strokeStyle': "black"
        };

    if (undefined === this.dataRange || undefined === this.dataRange.max || undefined === this.dataRange.min) {
        return;
    }

    IGVGraphics.fillRect(ctx, 0, 0, pixelWidth, pixelHeight, {'fillStyle': "rgb(255, 255, 255)"});

    reference = 0.95 * pixelWidth;
    x1 = reference - 8;
    x2 = reference;

    //shim = 0.5 * 0.125;
    shim = .01;
    y1 = y2 = shim * pixelHeight;

    a = {x: x2, y: y1};

    // tick
    IGVGraphics.strokeLine(ctx, x1, y1, x2, y2, font);
    IGVGraphics.fillText(ctx, prettyPrint(this.dataRange.max), x1 + 4, y1 + 12, font);

    //shim = 0.25 * 0.125;
    y1 = y2 = (1.0 - shim) * pixelHeight;

    b = {x: x2, y: y1};

    // tick
    IGVGraphics.strokeLine(ctx, x1, y1, x2, y2, font);
    IGVGraphics.fillText(ctx, prettyPrint(this.dataRange.min), x1 + 4, y1 - 4, font);

    IGVGraphics.strokeLine(ctx, a.x, a.y, b.x, b.y, font);

    function prettyPrint(number) {
        // if number >= 100, show whole number
        // if >= 1 show 1 significant digits
        // if <  1 show 2 significant digits

        if (number === 0) {
            return "0";
        } else if (Math.abs(number) >= 10) {
            return number.toFixed();
        } else if (Math.abs(number) >= 1) {
            return number.toFixed(1);
        } else {
            return number.toFixed(2);
        }
    }
}

export default paintAxis;
