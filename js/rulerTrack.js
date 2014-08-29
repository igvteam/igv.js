var igv = (function (igv) {

    //
    igv.RulerTrack = function () {
        this.height = 50;
        this.label = "";
        this.id = "ruler";
        this.disableButtons =  true;
    }

    /**
     *
     * @param canvas - an
     * @param tileStart
     * @param tileEnd
     * @param width
     * @param height
     * @param continuation
     */
    //   //  this.track.draw(igvCanvas, refFrame, tileStart, tileEnd, buffer.width, buffer.height, function () {

    igv.RulerTrack.prototype.draw = function (canvas, refFrame, tileStart, tileEnd, width, height, continuation) {


        canvas.setProperties({textAlign: 'center'});


        var range = Math.floor(1100 * refFrame.bpPerPixel);
        var ts = findSpacing(range);
        var spacing = ts.majorTick;

        // Find starting point closest to the current origin
        var nTick = Math.floor(tileStart / spacing) - 1;
        var x = 0

        //int strEnd = Integer.MIN_VALUE;
        while (x < width) {

            var l = Math.floor(nTick * spacing);
            x = Math.round(((l - 1) - tileStart + 0.5) / refFrame.bpPerPixel);
            var chrPosition = formatNumber(l / ts.unitMultiplier, 0) + " " + ts.majorUnit;
            //var chrPosition = "" + (l / ts.unitMultiplier) + " " + ts.majorUnit;
            //int strWidth = g.getFontMetrics().stringWidth(chrPosition);
            //int strPosition = x - strWidth / 2;
            //if (strPosition > strEnd) {

            //final int height = getHeight();
            if (nTick % 1 == 0) {
                canvas.fillText(chrPosition, x, this.height - 15);
            }

            canvas.strokeLine(x, this.height - 10, x, this.height - 2);

            nTick++;
        }
        canvas.strokeLine(0, this.height - 1, width, this.height - 1);


        continuation();

        function formatNumber(anynum, decimal) {
            //decimal  - the number of decimals after the digit from 0 to 3
            //-- Returns the passed number as a string in the xxx,xxx.xx format.
            //anynum = eval(obj.value);
            var divider = 10;
            switch (decimal) {
                case 0:
                    divider = 1;
                    break;
                case 1:
                    divider = 10;
                    break;
                case 2:
                    divider = 100;
                    break;
                default:       //for 3 decimal places
                    divider = 1000;
            }

            var workNum = Math.abs((Math.round(anynum * divider) / divider));

            var workStr = "" + workNum

            if (workStr.indexOf(".") == -1) {
                workStr += "."
            }

            var dStr = workStr.substr(0, workStr.indexOf("."));
            var dNum = dStr - 0
            var pStr = workStr.substr(workStr.indexOf("."))

            while (pStr.length - 1 < decimal) {
                pStr += "0"
            }

            if (pStr == '.') pStr = '';

            //--- Adds a comma in the thousands place.
            if (dNum >= 1000) {
                var dLen = dStr.length
                dStr = parseInt("" + (dNum / 1000)) + "," + dStr.substring(dLen - 3, dLen)
            }

            //-- Adds a comma in the millions place.
            if (dNum >= 1000000) {
                dLen = dStr.length
                dStr = parseInt("" + (dNum / 1000000)) + "," + dStr.substring(dLen - 7, dLen)
            }
            var retval = dStr + pStr
            //-- Put numbers in parentheses if negative.
            if (anynum < 0) {
                retval = "(" + retval + ")";
            }

            //You could include a dollar sign in the return value.
            //retval =  "$"+retval
            return retval;
        }


    }

    igv.RulerTrack.prototype.drawLabel = function (ctx) {

    }

    function TickSpacing(majorTick, majorUnit, unitMultiplier) {
        this.majorTick = majorTick;
        this.majorUnit = majorUnit;
        this.unitMultiplier = unitMultiplier;
    }

    function findSpacing(maxValue) {

        if (maxValue < 10) {
            return new TickSpacing(1, "", 1);
        }


        // Now man zeroes?
        var nZeroes = Math.floor(log10(maxValue));
        var majorUnit = "";
        var unitMultiplier = 1;
        if (nZeroes > 9) {
            majorUnit = "gb";
            unitMultiplier = 1000000000;
        }
        if (nZeroes > 6) {
            majorUnit = "mb";
            unitMultiplier = 1000000;
        } else if (nZeroes > 3) {
            majorUnit = "kb";
            unitMultiplier = 1000;
        }

        var nMajorTicks = maxValue / Math.pow(10, nZeroes - 1);
        if (nMajorTicks < 25) {
            return new TickSpacing(Math.pow(10, nZeroes - 1), majorUnit, unitMultiplier);
        } else {
            return new TickSpacing(Math.pow(10, nZeroes) / 2, majorUnit, unitMultiplier);
        }

        function log10(x) {
            var dn = Math.log(10);
            return Math.log(x) / dn;
        }
    }

    return igv;
})(igv || {});