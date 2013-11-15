/**
 * jQuery markup
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
    // Regular expressions
    //------------------------------

        /**
         * Matches classes in an element string. 'div.class'
         * @type {RegExp}
         */
    var RX_CLASS = /\.([a-zA-Z0-9_\-]+)/g,

        /**
         * Matches attributes in an element string. 'div[attr=value]'
         * @type {RegExp}
         */
        RX_ATTRIBUTE = /\[([a-z0-9_\-]+)(=([^\]]*))?\]/g,

        /**
         * Matches IDs in an element string. 'div#id'
         * @type {RegExp}
         */
        RX_ID = /#([a-zA-Z0-9_\-]+)/g;

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
    // Markup
    //------------------------------

    /**
     * Parse HTML shorthand into a jQuery object.
     * @param {string} shorthand The shorthand.
     * @return {jQuery} The created element.
     */
    function parse(shorthand) {
            // The element's attributes
        var attr = {},
            // The element's classes
            classes = [],
            // The matcher
            matcher,
            // The HTML content.
            html = "";

        switch (shorthand.substr(0, 1)) {

        case ".":
            return shorthand.substr(1);

        case "~":
            return $("<div/>").html(shorthand.substr(1)).contents();
        }

        if (shorthand.indexOf(">") > -1) {
            // Test to make sure this is just formatting and not an html tag
            if (shorthand.indexOf("<") === -1) {
                shorthand = shorthand.split(">");
                html = shorthand[1];
                shorthand = shorthand[0];
            }
        }

        // Extract attributes
        while (!!(matcher = RX_ATTRIBUTE.exec(shorthand))) {
            // matcher[2] would be the = sign
            if (matcher[2] === undefined) {
                attr[matcher[1]] = true;
            } else {
                attr[matcher[1]] = matcher[3];
            }
        }
        shorthand = shorthand.replace(RX_ATTRIBUTE, "");

        // Extract classes
        while (!!(matcher = RX_CLASS.exec(shorthand))) {
            classes.push(matcher[1]);
        }
        shorthand = shorthand.replace(RX_CLASS, "");

        // Extract ID attribute
        while (!!(matcher = RX_ID.exec(shorthand))) {
            attr.id = matcher[1];
        }
        shorthand = shorthand.replace(RX_ID, "");

        // Create the element
        return $("<" + shorthand + "/>", attr)
                .addClass(classes.join(" ")).html(html);
    }

    /**
     * Creates Elements from shorthand.
     * @param {...string|Array<string>} var_args The elements to parse.
     * @return {jQuery} The created elements.
     */
    function markup(var_args) {
        var shorthand = $.makeArray(arguments),
            elements,
            outputElements;

        // Handle an array of args instead of var args.
        if (shorthand.length === 1 && $.isArray(shorthand[0])) {
            shorthand = shorthand[0];
        }

        $.each(shorthand, function (i, s) {
            var out;
            if ($.isArray(s)) {
                out = markup.apply(markup, s);
                if (!elements) {
                    if (!outputElements) {
                        outputElements = [];
                    }

                    outputElements.push(out);
                } else {
                    elements.last().append(out);
                }
            } else if (typeof s === "string") {
                out = parse(s);
                if (typeof out === "string") {
                    // Always append strings to the last element.
                    elements.last().append(out);
                } else if (!elements) {
                    elements = out;
                } else {
                    elements = elements.add(out);
                }
            } else {
                throw "invalid argument: " + s;
            }
        });

        if (!elements) {
            if (!outputElements) {
                throw "nothing to append children to";
            }

            elements = outputElements.shift();
            $.each(outputElements, function (i, val) {
                elements = elements.add(val);
            });
        } else {
            elements = $(elements);
        }

        $.markup.queue.fire(elements);
        if (elements.length === 1) {
            return elements.eq(0);
        }

        return elements;
    }

    //------------------------------
    //
    // Exposure
    //
    //------------------------------

    //------------------------------
    // Window exposure
    //------------------------------

    window._$$ = window.$$;
    window.$$ = $.markup = markup;
    window.$$.noConflict = function () {
        window.$$ = window._$$;
        window._$$ = undefined;
        return $.markup;
    };
    $.markup.queue = $.Callbacks("unique");

}(window.jQuery));

