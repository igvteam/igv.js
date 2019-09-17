// Functions shared by both igv and juicebox.  A bit of a hack

const Shared = {

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
    }

}

export default Shared

