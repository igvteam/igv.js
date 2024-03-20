
import $ from "../vendor/jquery-3.3.1.slim.js"
import makeDraggable from "./utils/draggable.js"
import {attachDialogCloseHandlerWithParent} from "./utils/ui-utils.js"

class DataRangeDialog {

    constructor(browser, $parent) {

        this.browser = browser

        // dialog container
        this.$container = $("<div>", {class: 'igv-generic-dialog-container'})
        $parent.append(this.$container)
        this.$container.offset({left: 0, top: 0})

        // dialog header
        const $header = $("<div>", {class: 'igv-generic-dialog-header'})
        this.$container.append($header)
        attachDialogCloseHandlerWithParent($header[0], () => {
            this.$minimum_input.val('')
            this.$maximum_input.val('')
            this.$container.offset({left: 0, top: 0})
            this.$container.hide()
        })


        // minimun
        this.$minimum = $("<div>", {class: 'igv-generic-dialog-label-input'})
        this.$container.append(this.$minimum)
        const $mindiv = $('<div>')
        $mindiv.text('Minimum')
        this.$minimum.append($mindiv)
        this.$minimum_input = $("<input>")
        this.$minimum.append(this.$minimum_input)


        // maximum
        this.$maximum = $("<div>", {class: 'igv-generic-dialog-label-input'})
        this.$container.append(this.$maximum)
        const $maxdiv = $('<div>')
        $maxdiv.text('Maximum')
        this.$maximum.append($maxdiv)
        this.$maximum_input = $("<input>")
        this.$maximum.append(this.$maximum_input)

        // ok | cancel
        const $buttons = $("<div>", {class: 'igv-generic-dialog-ok-cancel'})
        this.$container.append($buttons)

        // ok
        this.$ok = $("<div>")
        $buttons.append(this.$ok)
        this.$ok.text('OK')

        // cancel
        this.$cancel = $("<div>")
        $buttons.append(this.$cancel)
        this.$cancel.text('Cancel')

        this.$cancel.on('click', () => {
            this.$minimum_input.val('')
            this.$maximum_input.val('')
            this.$container.offset({left: 0, top: 0})
            this.$container.hide()
        })

        //this.$container.draggable({ handle:$header.get(0) });
        makeDraggable(this.$container.get(0), $header.get(0))

        this.$container.hide()
    }

    configure(trackViewOrTrackViewList) {

        let dataRange
        if (Array.isArray(trackViewOrTrackViewList)) {
            dataRange = { min: Number.MAX_SAFE_INTEGER, max:-Number.MAX_SAFE_INTEGER }
            for (const trackView of trackViewOrTrackViewList) {
                if (trackView.dataRange) {
                    dataRange.min = Math.min(trackView.dataRange.min, dataRange.min)
                    dataRange.max = Math.max(trackView.dataRange.max, dataRange.max)
                }
            }
        } else {
            dataRange = trackViewOrTrackViewList.dataRange
        }

        if (dataRange) {
            this.$minimum_input.val(dataRange.min)
            this.$maximum_input.val(dataRange.max)
        }

        this.$minimum_input.unbind()
        this.$minimum_input.on('keyup', (e) => {
            if (13 === e.keyCode) {
                this.processResults(trackViewOrTrackViewList)
            }
        })

        this.$maximum_input.unbind()
        this.$maximum_input.on('keyup', (e) => {
            if (13 === e.keyCode) {
                this.processResults(trackViewOrTrackViewList)
            }
        })

        this.$ok.unbind()
        this.$ok.on('click', (e) => {
            this.processResults(trackViewOrTrackViewList)
        })
    }

    processResults(trackViewOfTrackViewList) {

        if ('' !== this.$minimum_input.val() && '' !== this.$maximum_input.val()) {

            const min = Number(this.$minimum_input.val())
            const max = Number(this.$maximum_input.val())

            if (isNaN(min) || isNaN(max)) {
                this.browser.alert.present(new Error('Must input numeric values'), undefined)
            } else {
                const list = Array.isArray(trackViewOfTrackViewList) ? trackViewOfTrackViewList : [ trackViewOfTrackViewList ]
                for (const trackView of list) {
                    trackView.dataRange = { min, max }
                }

            }

            this.$minimum_input.val('')
            this.$maximum_input.val('')

        }

        this.$container.offset({left: 0, top: 0})
        this.$container.hide()

    }

    present($parent) {

        const offset_top = $parent.offset().top
        const scroll_top = $('body').scrollTop()

        this.$container.offset({left: $parent.width() - this.$container.width(), top: (offset_top + scroll_top)})
        this.$container.show()
    }
}

export default DataRangeDialog
