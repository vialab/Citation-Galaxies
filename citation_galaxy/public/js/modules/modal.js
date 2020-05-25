/**
 * modal.js
 * Author: Nathan Beals
 * Date: 2020-03
 * 
 * modal.js Handles all modal related functionality found in this project
 */

'use strict'; // Explicitly declare what is already automatically set

// import {$,jQuery} from 'jquery'; // JQuery already loaded by the "old way" of loading it from index.html TODO DELMEs

// export var mode = "testing"; // TODO DELME


let errorModal = $('#errorModal')
export function warning(title, body) {
    errorModal.find('.modal-title')
        .text(title)

    errorModal.find('.modal-body')
        .text(body)

    errorModal.modal('show')
}


