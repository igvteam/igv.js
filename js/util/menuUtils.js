import $ from "../vendor/jquery-3.3.1.slim.js";

/**
 * Configure item list for track "gear" menu.
 * @param trackView
 */
const MenuUtils = {
    trackMenuItemList: function (trackView) {

        const vizWindowTypes = new Set(['alignment', 'annotation', 'variant', 'eqtl', 'snp']);

        const hasVizWindow = trackView.track.config && trackView.track.config.visibilityWindow !== undefined;

        let menuItems = [];

        if (trackView.track.config.type !== 'sequence') {
            menuItems.push(trackRenameMenuItem(trackView));
            menuItems.push(trackHeightMenuItem(trackView));
        }

        if (doProvideColoSwatchWidget(trackView.track)) {
            menuItems.push(colorPickerMenuItem(trackView))
        }

        if (trackView.track.menuItemList) {
            menuItems = menuItems.concat(trackView.track.menuItemList());
        }

        if (hasVizWindow || vizWindowTypes.has(trackView.track.config.type)) {
            menuItems.push('<hr/>');
            menuItems.push(visibilityWindowMenuItem(trackView));
        }

        if (trackView.track.removable !== false) {
            menuItems.push('<hr/>');
            menuItems.push(trackRemovalMenuItem(trackView));
        }

        return menuItems;
    },

    dataRangeMenuItem: function (trackView) {

        var $e,
            clickHandler;

        $e = $('<div>');
        $e.text('Set data range');

        clickHandler = function () {
            trackView.browser.dataRangeDialog.configure({trackView: trackView});
            trackView.browser.dataRangeDialog.present($(trackView.trackDiv));
        };

        return {object: $e, click: clickHandler};
    },

    trackMenuItemListHelper: function(itemList, $popover) {

    var list = [];

    if (itemList.length > 0) {

        list = itemList.map(function (item, i) {
            var $e;

            // name and object fields checked for backward compatibility
            if (item.name) {
                $e = $('<div>');
                $e.text(item.name);
            } else if (item.object) {
                $e = item.object
            } else if (typeof item.label === 'string') {
                $e = $('<div>');
                $e.text(item.label)
            } else if (typeof item === 'string') {

                if (item.startsWith("<")) {
                    $e = $(item);
                } else {
                    $e = $("<div>" + item + "</div>");
                }
            }

            if (0 === i) {
                $e.addClass('igv-track-menu-border-top');
            }

            if (item.click) {
                $e.on('click', handleClick);
                $e.on('touchend', function (e) {
                    handleClick(e);
                });
                $e.on('mouseup', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                })

                function handleClick(e) {
                    item.click();
                    $popover.hide();
                    e.preventDefault();
                    e.stopPropagation()
                }
            }

            return {object: $e, init: (item.init || undefined)};
        });
    }

    return list;
}

}

function doProvideColoSwatchWidget(track) {
    return (
        "alignment" === track.type ||
        "annotation" === track.type ||
        "variant" === track.type ||
        "wig" === track.type);
}


function visibilityWindowMenuItem(trackView) {

    const menuClickHandler = function () {

        const dialogClickHandler = function () {

            let value = trackView.browser.inputDialog.$input.val().trim();

            if ('' === value || undefined === value) {
                value = -1;
            }

            value = Number.parseInt(value);

            trackView.track.visibilityWindow = value;
            trackView.track.config.visibilityWindow = value;

            trackView.updateViews();
        };

        trackView.browser.inputDialog.configure({
            label: 'Visibility Window',
            input: (trackView.track.visibilityWindow),
            click: dialogClickHandler
        });
        trackView.browser.inputDialog.present($(trackView.trackDiv));

    };

    const $e = $('<div>');
    $e.text('Set visibility window');

    return {object: $e, click: menuClickHandler};


}

function trackRemovalMenuItem(trackView) {

    var $e,
        menuClickHandler;

    $e = $('<div>');
    $e.text('Remove track');

    menuClickHandler = function () {
        trackView.browser.removeTrack(trackView.track);
    };

    return {object: $e, click: menuClickHandler};

}


function colorPickerMenuItem(trackView) {
    var $e,
        clickHandler;

    $e = $('<div>');
    $e.text('Set track color');

    clickHandler = function () {
        trackView.presentColorPicker();
    };

    return {
        object: $e,
        click: clickHandler
    };

}

function trackRenameMenuItem(trackView) {

    var $e,
        menuClickHandler;

    $e = $('<div>');
    $e.text('Set track name');

    menuClickHandler = function () {

        var dialogClickHandler;

        dialogClickHandler = function () {
            var value;

            value = trackView.browser.inputDialog.$input.val().trim();

            value = ('' === value || undefined === value) ? 'untitled' : value;

            trackView.browser.setTrackLabelName(trackView, value);

        };

        trackView.browser.inputDialog.configure({
            label: 'Track Name',
            input: (getTrackLabelText(trackView.track) || 'unnamed'),
            click: dialogClickHandler
        });
        trackView.browser.inputDialog.present($(trackView.trackDiv));

    };

    return {object: $e, click: menuClickHandler};


}

function trackHeightMenuItem(trackView) {

    var $e,
        menuClickHandler;

    $e = $('<div>');
    $e.text('Set track height');

    menuClickHandler = function () {
        var dialogClickHandler;

        dialogClickHandler = function () {

            var number;

            number = parseFloat(trackView.browser.inputDialog.$input.val(), 10);

            if (undefined !== number) {

                // If explicitly setting the height adust min or max, if neccessary.
                if (trackView.track.minHeight !== undefined && trackView.track.minHeight > number) {
                    trackView.track.minHeight = number;
                }
                if (trackView.track.maxHeight !== undefined && trackView.track.maxHeight < number) {
                    trackView.track.minHeight = number;
                }
                trackView.setTrackHeight(number, true, true);

                // Explicitly setting track height turns off autoHeight
                trackView.track.autoHeight = false;
            }

        };

        trackView.browser.inputDialog.configure({
            label: 'Track Height',
            input: trackView.trackDiv.clientHeight,
            click: dialogClickHandler
        });
        trackView.browser.inputDialog.present($(trackView.trackDiv));

    };

    return {object: $e, click: menuClickHandler};


}

function getTrackLabelText(track) {
    var vp,
        txt;

    vp = track.trackView.viewports[0];
    txt = vp.$trackLabel.text();

    return txt;
}

export default MenuUtils;


/**
 * Configure item list for contextual (right-click) track popup menu.
 * @param viewport
 * @param genomicLocation - (bp)
 * @param xOffset - (pixels) within track extent
 * @param yOffset - (pixels) within track extent
 */
// igv.trackContextMenuItemList = function (viewport, genomicLocation, xOffset, yOffset) {
//
//     var config,
//         menuItems;
//
//     config =
//         {
//             viewport: viewport,
//             genomicState: viewport.genomicState,
//             genomicLocation: genomicLocation,
//             x: xOffset,
//             y: yOffset
//         };
//
//     menuItems = [];
//     if (typeof viewport.trackView.track.contextMenuItemList === "function") {
//         menuItems = viewport.trackView.track.contextMenuItemList(config);
//     }
//
//     return menuItems;
// };


/**
 * Configure item for track "gear" menu.
 * @param trackView
 * @param menuItemLabel - menu item string
 * @param dialogLabelHandler - dialog label creation handler
 * @param dialogInputValue
 * @param dialogClickHandler
 */
// function trackMenuItem(trackView, menuItemLabel, dialogLabelHandler, dialogInputValue, dialogClickHandler) {
//
//     var $e,
//         clickHandler;
//
//     $e = $('<div>');
//
//     $e.text(menuItemLabel);
//
//     clickHandler = function () {
//
//         trackView.browser.inputDialog.configure(dialogLabelHandler, dialogInputValue, dialogClickHandler, undefined, undefined);
//         trackView.browser.inputDialog.show($(trackView.trackDiv));
//
//     };
//
//     return {object: $e, click: clickHandler};
// };
