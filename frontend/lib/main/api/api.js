/**
 * Main API
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
    // Configuration
    //
    //------------------------------

    //------------------------------
    //
    // API Call
    //
    //------------------------------

    //------------------------------
    // Calls
    //------------------------------

    $.api("gamestate", {
        url: "/game"
    });

}(window.jQuery));

