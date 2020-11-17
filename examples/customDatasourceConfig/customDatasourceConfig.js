import { ModalTable, GenericMapDatasource } from './node_modules/data-modal/js/index.js'
import { customConfigurator } from './config.js'
import igv from '../../js/index.js'

const customModalConfig =
    {
        id: 'customModal',
        title: 'Custom Modal',
        pageLength: 100,
        selectionStyle: 'multi',
        selectHandler: async (selectionList) => {

                await igv.browser.loadTrackList(selectionList)
        }
    }

const customModal = new ModalTable(customModalConfig)
const customDatasource = new GenericMapDatasource(customConfigurator())
customModal.setDatasource(customDatasource)
