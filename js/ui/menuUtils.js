import $ from "../vendor/jquery-3.3.1.slim.js";
import {createCheckbox} from "../igv-icons.js"

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

        if (this.showColorPicker(trackView.track)) {
            menuItems.push(colorPickerMenuItem({trackView, label: "Set track color", option: "color"}));
            menuItems.push(colorPickerMenuItem({trackView, label: "Set alt color", option: "altColor"}));
            menuItems.push(unsetColorMenuItem({trackView, label: "Unset track color"}));
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

    numericDataMenuItems: function (trackView) {

        const menuItems = [];

        // Data range
        const $e = $('<div>');
        $e.text('Set data range');
        const clickHandler = function () {
            trackView.browser.dataRangeDialog.configure({trackView: trackView});
            trackView.browser.dataRangeDialog.present($(trackView.trackDiv));
        };
        menuItems.push({object: $e, click: clickHandler});

        if (trackView.track.logScale !== undefined) {
            menuItems.push({
                    object: createCheckbox("Log scale", trackView.track.logScale),
                    click: () => {
                        trackView.track.logScale = !trackView.track.logScale;
                        trackView.repaintViews();
                    }
                }
            )
        }

        menuItems.push({
                object: createCheckbox("Autoscale", trackView.track.autoscale),
                click: () => {
                    trackView.track.autoscale = !trackView.track.autoscale;
                    trackView.updateViews();
                }
            }
        )


        return menuItems;
    },

    trackMenuItemListHelper: function (itemList, $popover) {

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
                    $e.html(item.label)
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

                    // eslint-disable-next-line no-inner-declarations
                    function handleClick(e) {
                        item.click(e);
                        $popover.hide();
                        e.preventDefault();
                        e.stopPropagation()
                    }
                }

                return {object: $e, init: (item.init || undefined)};
            });
        }

        return list;
    },

    showColorPicker(track) {
        return (
            undefined === track.type ||
            "bedtype" === track.type ||
            "alignment" === track.type ||
            "annotation" === track.type ||
            "variant" === track.type ||
            "wig" === track.type);
    }

}


function visibilityWindowMenuItem(trackView) {

    const click = e => {

        const callback = () => {

            let value = trackView.browser.inputDialog.input.value
            value = '' === value || undefined === value ? -1 : value.trim()

            trackView.track.visibilityWindow = Number.parseInt(value);
            trackView.track.config.visibilityWindow = Number.parseInt(value);

            trackView.updateViews();
        }

        const config =
            {
                label: 'Visibility Window',
                value: (trackView.track.visibilityWindow),
                callback
            }
        trackView.browser.inputDialog.present(config, e);

    };

    const object = $('<div>');
    object.text('Set visibility window');
    return {object, click};

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

function colorPickerMenuItem({trackView, label, option}) {

    const $e = $('<div>');
    $e.text(label);

    return {
        object: $e,
        click: () => trackView.presentColorPicker(option)
    }
}

function unsetColorMenuItem({trackView, label}) {

    const $e = $('<div>');
    $e.text(label);

    return {
        object: $e,
        click: () => {
            trackView.track.color = undefined;
            trackView.repaintViews();
        }
    }
}

function trackRenameMenuItem(trackView) {

    const click = e => {

        const callback = function () {
            let value = trackView.browser.inputDialog.input.value;
            value = ('' === value || undefined === value) ? 'untitled' : value.trim();
            trackView.browser.setTrackLabelName(trackView, value);
        };

        const config =
            {
                label: 'Track Name',
                value: (getTrackLabelText(trackView.track) || 'unnamed'),
                callback
            }

        trackView.browser.inputDialog.present(config, e);

    };

    const object = $('<div>');
    object.text('Set track name');
    return {object, click};


}

function trackHeightMenuItem(trackView) {

    const click = e => {

        const callback = () => {

            const number = parseFloat(trackView.browser.inputDialog.input.value, 10);

            if (undefined !== number) {

                // If explicitly setting the height adust min or max, if neccessary.
                if (trackView.track.minHeight !== undefined && trackView.track.minHeight > number) {
                    trackView.track.minHeight = number;
                }
                if (trackView.track.maxHeight !== undefined && trackView.track.maxHeight < number) {
                    trackView.track.minHeight = number;
                }
                trackView.setTrackHeight(number, true);

                // Explicitly setting track height turns off autoHeight
                trackView.track.autoHeight = false;
            }

        };

        const config =
            {
                label: 'Track Height',
                value: trackView.trackDiv.clientHeight,
                callback
            }

        trackView.browser.inputDialog.present(config, e);

    };

    const object = $('<div>');
    object.text('Set track height');
    return {object, click};


}

function getTrackLabelText(track) {
    var vp,
        txt;

    vp = track.trackView.viewports[0];
    txt = vp.$trackLabel.text();

    return txt;
}

export default MenuUtils;
