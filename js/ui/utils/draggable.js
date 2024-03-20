/**
 * Make the target element movable by clicking and dragging on the handle.  This is not a general purprose function,
 * it makes several options specific to igv dialogs, the primary one being that the
 * target is absolutely positioned in pixel coordinates

 */

let dragData  // Its assumed we are only dragging one element at a time.

function makeDraggable(target, handle, constraint) {

    handle.addEventListener('mousedown', dragStart.bind(target))

    function dragStart(event) {

        event.stopPropagation()
        event.preventDefault()

        const dragFunction = drag.bind(this)
        const dragEndFunction = dragEnd.bind(this)
        const computedStyle = getComputedStyle(this)


        const boundingClientRect = this.getBoundingClientRect()
        dragData =
            {
                constraint,
                dragFunction,
                dragEndFunction,
                screenX: event.screenX,
                screenY: event.screenY,
                minDy: -boundingClientRect.top,   // Don't slide upwards more than this
                minDx: -boundingClientRect.left,
                top: parseInt(computedStyle.top.replace("px", "")),
                left: parseInt(computedStyle.left.replace("px", ""))
            }

        document.addEventListener('mousemove', dragFunction)
        document.addEventListener('mouseup', dragEndFunction)
        document.addEventListener('mouseleave', dragEndFunction)
        document.addEventListener('mouseexit', dragEndFunction)
    }
}

function drag(event) {

    if (!dragData) {
        console.error("No drag data!")
        return
    }
    event.stopPropagation()
    event.preventDefault()
    const dx = Math.max(dragData.minDx, event.screenX - dragData.screenX)
    const dy = Math.max(dragData.minDy, event.screenY - dragData.screenY)
    const left = dragData.left + dx
    const top = dragData.top + dy

    this.style.left = `${left}px`
    this.style.top = `${top}px`
}

function dragEnd(event) {

    if (!dragData) {
        console.error("No drag data!")
        return
    }
    event.stopPropagation()
    event.preventDefault()

    const dragFunction = dragData.dragFunction
    const dragEndFunction = dragData.dragEndFunction
    document.removeEventListener('mousemove', dragFunction)
    document.removeEventListener('mouseup', dragEndFunction)
    document.removeEventListener('mouseleave', dragEndFunction)
    document.removeEventListener('mouseexit', dragEndFunction)
    dragData = undefined
}

export default makeDraggable
