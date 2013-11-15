/**
 * Main application
 *
 * Copyright (c) 2012 Knewton
 * Dual licensed under:
 *  MIT: http://www.opensource.org/licenses/mit-license.php
 *  GPLv3: http://www.opensource.org/licenses/gpl-3.0.html
 */
/*jslint browser: true, maxerr: 50, indent: 4, maxlen: 79 */
(function ($) {
    "use strict";

    //------------------------------
    //
    // Constants
    //
    //------------------------------

    //------------------------------
    //
    // Properties
    //
    //------------------------------

    //------------------------------
    //
    // Methods
    //
    //------------------------------

    //------------------------------
    //
    // Event bindings
    //
    //------------------------------

    $.localized(function () {
        $.deeplink.activate("/");
    });

    //------------------------------
    //
    // Exposure
    //
    //------------------------------

    //------------------------------
    // Authentication
    //------------------------------

    // Use the knewton login system
    //$.tokenAuthentication();

    // Allow in anyone
    $.anonymousAuthentication();

}(window.jQuery));

