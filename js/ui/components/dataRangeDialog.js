import Textbox from "./textbox.js"
import Panel from "./panel.js"
import Dialog from "./dialog.js"
import * as DOMUtils from "../utils/dom-utils.js"

class DataRangeDialog {

    constructor(parent, okHandler) {

        const panel = new Panel();
        this.minbox = new Textbox({label: "Minimum", value: "0"});
        panel.add(this.minbox);

        this.maxbox = new Textbox({label: "Maximum", value: "0"});
        panel.add(this.maxbox);

        let callback;
        if (okHandler) {
            callback = (e) => {
                okHandler(Number.parseFloat(this.minbox.value), Number.parseFloat(this.maxbox.value));
            }
        } else {
            callback = (d) => {
                console.log(`Minimum: ${this.minbox.value}`)
                console.log(`Maximum: ${this.maxbox.value}`);
            }
        }

        this.dialog = new Dialog({
            //label: 'Multi-select',
            content: panel,
            okHandler: callback
        })

        // Overide some css styles -- TODO redesign this.
        this.dialog.elem.style.position = "absolute"

        DOMUtils.hide(this.dialog.elem);
        parent.appendChild(this.dialog.elem);
    }

    show({min, max}) {
        if (min !== undefined) this.minbox.value = min.toString();
        if (max !== undefined) this.maxbox.value = max.toString();
        DOMUtils.show(this.dialog.elem);
    }
}

export default DataRangeDialog
