import { ModalTable, GenericMapDatasource, exampleCustomConfigurator } from './node_modules/data-modal/js/index.js'

const customModalConfig =
    {
        id: 'customModal',
        title: 'Custom Modal',
        pageLength: 100,
        selectionStyle: 'multi',
        selectHandler: selectionList => console.log(selectionList)
    }

const customModal = new ModalTable(customModalConfig)
const customDatasource = new GenericMapDatasource(exampleCustomConfigurator())
customModal.setDatasource(customDatasource)
