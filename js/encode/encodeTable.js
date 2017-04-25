/*
 * The MIT License (MIT)
 *
 * Copyright (c) 2016-2017 The Regents of the University of California
 * Author: Jim Robinson
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
 * Created by dat on 4/18/17.
 */

var encode = (function (encode) {

    var antibodyColors =
            {
                H3K27AC: "rgb(200, 0, 0)",
                H3K27ME3: "rgb(130, 0, 4)",
                H3K36ME3: "rgb(0, 0, 150)",
                H3K4ME1: "rgb(0, 150, 0)",
                H3K4ME2: "rgb(0, 150, 0)",
                H3K4ME3: "rgb(0, 150, 0)",
                H3K9AC: "rgb(100, 0, 0)",
                H3K9ME1: "rgb(100, 0, 0)"
            },
        defaultColor ="rgb(3, 116, 178)";


    encode.EncodeTable = function ($parent, browser) {

        var self = this;

        this.browser = browser;

        this.initialized = false;

        this.$modalTable = $('<table id="encodeModalTable" cellpadding="0" cellspacing="0" border="0" class="display"></table>');
        $parent.append(this.$modalTable);

        this.$spinner = $('<div>');
        this.$modalTable.append(this.$spinner);

        this.$spinner.append($('<i class="fa fa-lg fa-spinner fa-spin"></i>'));

        $('#hicEncodeModal').on('shown.bs.modal', function (e) {

            if (true !== self.initialized) {

                self.initialized = true;

                encode.encodeSearch(function (json) {
                    self.loadWithDataSource(json);
                });

            }

        });

        $('#encodeModalTopCloseButton').on('click', function () {
            $('tr.selected').removeClass('selected');
        });

        $('#encodeModalBottomCloseButton').on('click', function () {
            $('tr.selected').removeClass('selected');
        });

        $('#encodeModalGoButton').on('click', function () {

            var tableRows,
                dataTableAPIInstance,
                index,
                data,
                raw,
                mapped;

            dataTableAPIInstance = self.$modalTable.DataTable();

            tableRows = self.$dataTables.$('tr.selected');


            if (tableRows) {

                tableRows.removeClass('selected');

                raw = [];
                tableRows.each(function() {

                    data = dataTableAPIInstance.row( this ).data();
                    index = data[ 0 ];

                    raw.push( self.dataSource.jSON.rows[ index ] );

                });

                mapped = _.map(raw, function(r) {

                    var obj;

                    obj =
                        {
                            type: r[ 'Format' ],
                            url: r[ 'url' ],
                            color: encodeAntibodyColor(r[ 'Target' ]),
                            format: r['Format'],
                            name: r['Name']
                        };

                    return obj;
                });


                console.log('do something cool with ' + _.size(mapped) + ' tracks.');
                self.browser.loadTrack(_.first(mapped));


            }

        });

    };

    encode.EncodeTable.prototype.loadWithDataSource = function (json) {

        var self = this;

        console.log('dataTable - begin');

        this.dataSource = new encode.EncodeDataSource({jSON: json});

        this.dataSource.loadJSON(function () {

            self.$spinner.hide();
            self.$dataTables = self.$modalTable.dataTable({

                data: self.dataSource.dataTablesData(),
                // deferRender: true,
                paging: true, /* must be true if scroller is enable */
                scrollX: true,
                scrollY: 400,
                scrollCollapse: true,
                scroller: true,
                autoWidth: true,
                columnDefs: [ { targets:0, visible: false } ],
                columns: self.dataSource.columnHeadings()
            });

            console.log('dataTable - end');

            self.$modalTable.find('tbody').on('click', 'tr', function () {

                if ($(this).hasClass('selected')) {
                    $(this).removeClass('selected');
                } else {
                    $(this).addClass('selected');
                }

            });

        });

    };

    function encodeAntibodyColor (antibody) {

        var key;

        if (!antibody || "" === antibody) {
            return defaultColor;
        }

        key = antibody.toUpperCase();
        return (antibodyColors[ key ]) ? antibodyColors[ key ] : defaultColor;

    }

    return encode;

})(encode || {});
