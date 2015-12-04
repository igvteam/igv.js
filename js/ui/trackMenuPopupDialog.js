/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Broad Institute
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * Created by turner on 12/11/14.
 */
var igv = (function (igv) {

    igv.TrackMenuPopupDialog = function (trackMenu, dialogLabel, inputValue, ok, width, height) {

        var myself = this,
            dialogLabelRE,
            inputValueRE,
            htmlString;

        htmlString = '<div id="dialog-form" title="DIALOG_LABEL"><p class="validateTips"></p><form><fieldset><input type="text" name="name" id="name" value="INPUT_VALUE"></fieldset></form></div>';

        dialogLabelRE = new RegExp("DIALOG_LABEL", "g");
        htmlString = htmlString.replace(dialogLabelRE, dialogLabel);

        inputValueRE = new RegExp("INPUT_VALUE", "g");
        htmlString = htmlString.replace(inputValueRE, inputValue);

        $( "body" ).append( $.parseHTML( htmlString ) );

        this.dialogForm = $( "#dialog-form" );
        this.form = this.dialogForm.find( "form" );
        this.name = $( "#name" );
        this.tips = $( ".validateTips" );

        this.dialogForm.dialog({

            autoOpen: false,

            width: (width || 320),

            height: (height || 256),

            modal: true,

            buttons: {
                ok: ok,

                cancel: function() {

                    myself.dialogForm.dialog( "close" );
                }
            },

            close: function() {

                myself.form[ 0 ].reset();
                myself.dialogForm.remove();
                myself.dialogForm = undefined;
                if (trackMenu) trackMenu.hide();
            }
        });

        this.form.on("submit", function( event ) {

            event.preventDefault();

            $( "#users" ).find(" tbody").append( "<tr>" + "<td>" + myself.name.val() + "</td>" + "</tr>" );
            myself.dialogForm.dialog( "close" );
        });

    };

    igv.TrackMenuPopupDialog.prototype.updateTips = function ( t ) {

        var myself = this;

        this.tips.text( t ).addClass( "ui-state-highlight" );

        setTimeout(function() {
            myself.tips.removeClass( "ui-state-highlight", 1500 );
        }, 500 );
    };

    return igv;

})(igv || {});
