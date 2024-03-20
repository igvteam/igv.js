import AlertDialog from './components/alertDialog.js';

class AlertSingleton {
    constructor(root) {

        if (root) {
            this.alertDialog = undefined;
        }
    }

    init(root) {
        this.alertDialog = new AlertDialog(root);
    }

    present(alert, callback) {
        this.alertDialog.present(alert, callback);
    }

}

export default new AlertSingleton();
