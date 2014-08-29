var igv = (function (igv) {

    igv.Canvas = function (canvas) {

        this.canvas = canvas;

        this.ctx = canvas.getContext('2d');

    };

    /**
     * Set styling properties.  For now this is just a pass-through to the underlying canvas context.
     *
     * @param properties
     */
    igv.Canvas.prototype.setProperties = function (properties) {

        for (var key in properties) {
            if (properties.hasOwnProperty(key)) {
                var value = properties[key];
                this.ctx[key] = value;
            }
        }
    };

    igv.Canvas.prototype.clearRect = function (x, y, w, h) {
        this.ctx.clearRect(x, y, w, h);

    };


    igv.Canvas.prototype.save = function () {
        this.ctx.save();

    };


    igv.Canvas.prototype.restore = function () {
        this.ctx.restore();

    };


    igv.Canvas.prototype.strokeLine = function (x1, y1, x2, y2, properties) {

        x1 = Math.floor(x1) + 0.5;
        y1 = Math.floor(y1) + 0.5;
        x2 = Math.floor(x2) + 0.5;
        y2 = Math.floor(y2) + 0.5;

        this.ctx.save();
        if (properties) this.setProperties(properties);

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        this.ctx.restore();
    };


    igv.Canvas.prototype.fillRect = function (x, y, w, h, properties) {

        var c;
        x = Math.round(x);
        y = Math.round(y);

        if (properties) {
            this.ctx.save();
            this.setProperties(properties, this);
        }

        this.ctx.fillRect(x, y, w, h);

        if (properties) this.ctx.restore();
    };

    igv.Canvas.prototype.strokeRect = function (x, y, w, h, properties) {
        x = Math.round(x);
        y = Math.round(y);

        if (properties) {
            this.ctx.save();
            this.setProperties(properties, this);
        }

        this.ctx.strokeRect(x, y, w, h);

        if (properties) this.ctx.restore();
    };

    igv.Canvas.prototype.fillRectWithCenter = function (centerX, centerY, width, height, properties) {

        var x = Math.round(centerX - width / 2.0),
            y = Math.round(centerY - height / 2.0);

        if (properties) {
            this.ctx.save();
            this.setProperties(properties, this);
        }

        this.ctx.fillRect(x, y, width, height);

        if (properties) this.ctx.restore();
    };

//        + (CGRect)rectWithCenter:(CGPoint)center size:(CGSize)size {
//
//        CGSize halfSize = CGSizeMake(size.width/2.0, size.height/2.0);
//
//        return CGRectMake(center.x - halfSize.width, center.y - halfSize.height, size.width, size.height);
//    }

    /**
     *
     * @param x - array of "x" values
     * @param y - array of "y" values
     * @param properties
     */
    igv.Canvas.prototype.fillPolygon = function (x, y, properties) {

        var i, len = x.length;
        for (i = 0; i < len; i++) {
            x[i] = Math.round(x[i]);
            y[i] = Math.round(y[i]);
        }

        this.ctx.save();
        if (properties)   this.setProperties(properties, this);

        this.ctx.beginPath();
        this.ctx.moveTo(x[0], y[0]);
        for (i = 1; i < len; i++) {
            this.ctx.lineTo(x[i], y[i]);
        }
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();
    };


    igv.Canvas.prototype.fillText = function (text, x, y, properties, transforms) {

        if (properties) {
            this.ctx.save();
            this.setProperties(properties, this);
        }


        this.ctx.save();

        this.ctx.translate(x, y);
        if (transforms) {

            for (var transform in transforms) {
                var value = transforms[transform];

                // TODO: Add error checking for robustness
                if (transform == 'translate') {
                    this.ctx.translate(value['x'], value['y']);
                }
                if (transform == 'rotate') {
                    this.ctx.rotate(value['angle'] * Math.PI / 180);
                }
            }

        }

        this.ctx.fillText(text, 0, 0);
        this.ctx.restore();

        if (properties) this.ctx.restore();

    };


    igv.Canvas.prototype.strokeText = function (text, x, y, properties, transforms) {

        if (properties) {
            //this.ctx.save();
            this.setProperties(properties);
        }

        this.ctx.save();

        this.ctx.translate(x, y);
        if (transforms) {

            for (var transform in transforms) {
                var value = transforms[transform];

                // TODO: Add error checking for robustness
                if (transform == 'translate') {
                    this.ctx.translate(value['x'], value['y']);
                }
                if (transform == 'rotate') {
                    this.ctx.rotate(value['angle'] * Math.PI / 180);
                }
            }

        }


        this.ctx.strokeText(text, 0, 0);
        this.ctx.restore();
        //this.ctx.strokeText(text, x, y);


        if (properties) {
            //this.ctx.restore();
        }


    };

    igv.Canvas.prototype.strokeCircle = function (x, y, radius) {

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.stroke();
    };


    igv.Canvas.prototype.fillCircle = function (x, y, radius) {

        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fill();
    };


    return igv;
})(igv || {});


