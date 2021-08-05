import { DOMUtils, Icon } from "../node_modules/igv-utils/src/index.js";
import {randomRGB} from "./util/colorPalletes.js";
import MenuPopup from "./ui/menuPopup.js";
import MenuUtils from "./ui/menuUtils.js";

// css - $igv-track-gear-menu-column-width: 28px;
const igv_track_gear_menu_column_width = 28;

class TrackGearControl {
    constructor(columnContainer) {
        this.column = DOMUtils.div({ class: 'igv-gear-menu-column' })
        columnContainer.appendChild(this.column)
    }

    addGearMenu(browser, trackView) {

        const gearContainer = DOMUtils.div()
        this.column.appendChild(gearContainer);

        // gearContainer.style.backgroundColor = randomRGB(150, 250);
        gearContainer.style.height = `${ trackView.track.height }px`

        const gear = DOMUtils.div()
        gearContainer.appendChild(gear)

        gear.appendChild(Icon.createIcon('cog'))

        const trackGearPopup = new MenuPopup(gear);

        gear.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            trackGearPopup.presentMenuList(MenuUtils.trackMenuItemList(trackView));
        });

        trackView.gearContainer = gearContainer;

    }

    removeGearContainer(trackView) {
        trackView.gearContainer.remove()
    }

    addGearShim(trackView) {
        const gearContainer = DOMUtils.div()
        this.column.appendChild(gearContainer)

        // gearContainer.style.backgroundColor = randomRGB(150, 250);
        gearContainer.style.height = `${ trackView.track.height }px`

        trackView.gearContainer = gearContainer
    }
}

export { igv_track_gear_menu_column_width }
export default TrackGearControl
