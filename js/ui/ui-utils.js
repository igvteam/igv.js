import {createIcon} from "../igv-icons";

function attachDialogCloseHandlerWithParent($parent, closeHandler) {

    var $container = $('<div>');
    $parent.append($container);

    $container.append(createIcon("times"));

    $container.on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closeHandler()
    });

    // $container.on('touchend', function (e) {
    //     e.preventDefault();
    //     e.stopPropagation();
    //     closeHandler()
    // });
    //
    // $container.on('mousedown', function (e) {
    //     e.preventDefault();
    //     e.stopPropagation();
    // });
    //
    // $container.on('mouseup', function (e) {
    //     e.preventDefault();
    //     e.stopPropagation();
    // });
    //
    // $container.on('touchstart', function (e) {
    //     e.preventDefault();
    //     e.stopPropagation();
    // });

};

export {attachDialogCloseHandlerWithParent}


/**
 * Find spinner
 */
// function getSpinnerObjectWithParentElement(parentElement) {
//     return $(parentElement).find("div.igv-spinner-container");
// };

/**
 * Start the spinner for the parent element, if it has one
 */
// function startSpinnerAtParentElement(parentElement) {
//
//     var spinnerObject = igv.getSpinnerObjectWithParentElement(parentElement);
//
//     if (spinnerObject) {
//         spinnerObject.show();
//     }
//
// };

/**
 * Stop the spinner for the parent element, if it has one
 * @param parentElement
 */
// function stopSpinnerAtParentElement(parentElement) {
//
//     var spinnerObject = igv.getSpinnerObjectWithParentElement(parentElement);
//
//     if (spinnerObject) {
//         spinnerObject.hide();
//     }
//
// };

// igv.makeToggleButton = function (label, configurationKey, get$Target, continuation) {
//
//     var $button;
//
//     $button = $('<div class="igv-nav-bar-button">');
//     $button.text(label);
//
//     $button.click(function () {
//
//         var $target = get$Target();
//
//         $target.toggle();
//
//         if (continuation) {
//             continuation();
//         }
//     });
//
//
//     return $button;
// };