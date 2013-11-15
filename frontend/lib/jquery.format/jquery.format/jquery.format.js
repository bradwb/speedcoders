/**
 * jQuery format
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
    // Expressions: Format
    //------------------------------

        /**
         * Matches period/bracket separated properties.
         * @type {RegExp}
         * @const
         */
    var RX_KEYS = /\.[^\.]+|\[[^\]]+\]/g,

        /**
         * Cleans formatting characters out of the key.
         * @type {RegExp}
         * @const
         */
        RX_KEY_CLEANER = /[\.\[\]]/g,

        /**
         * Matches an field's explicit position.
         * @type {RegExp}
         * @const
         */
        RX_DIGIT = /^\d+$/,

        /**
         * Matches groups of three numbers using lookahead magic.
         * @type {RegExp}
         * @const
         */
        RX_THOUSANDS = /\B(?=(\d{3})+(?!\d))/g,

    //------------------------------
    // Expressions: Spec Format
    //------------------------------

        /**
         * Matches the [[fill]align] spec declaration.
         * @type {RegExp}
         * @const
         */
        RX_SPEC_FILL_ALIGN = /^(.)?(\^|>|<|=)/,

        /**
         * Matches the [sign] spec declaration.
         * @type {RegExp}
         * @const
         */
        RX_SPEC_SIGN = /^(\+|\-|\s)/,

        /**
         * Matches the [,] spec declaration.
         * @type {RegExp}
         * @const
         */
        RX_SPEC_THOUSANDS = /^,/,

        /**
         * Matches the [#] spec declaration.
         * @type {RegExp}
         * @const
         */
        RX_SPEC_ALTERNATE = /^#/,

        /**
         * Matches the [0] spec declaration.
         * @type {RegExp}
         * @const
         */
        RX_SPEC_ZERO = /^0/,

        /**
         * Matches the [width] spec declaration.
         * @type {RegExp}
         * @const
         */
        RX_SPEC_WIDTH = /^\d+/,

        /**
         * Matches the [.precision] spec declaration.
         * @type {RegExp}
         * @const
         */
        RX_SPEC_PRECISION = /^\.(\d+)/,

        /**
         * Matches the [type] declaration for intergers.
         * @type {RegExp}
         * @const
         */
        RX_SPEC_INTERGER = /^[bcdoxXn]/,

        /**
         * Matches the [type] declaration for floats.
         * @type {RegExp}
         * @const
         */
        RX_SPEC_FLOAT = /^[eEfFgGn%]/,

    //------------------------------
    // Expression: String manipulation
    //------------------------------

        /**
         * Matches the parts of a string separated by a dash or underscore.
         * @type {RegExp}
         * @const
         */
        RX_USCORE_DASH = /[_|-]([a-z]|[0-9])/ig,

        /**
         * Matches uppercase words in a string.
         * @type {RegExp}
         * @const
         */
        RX_UPPER = /([A-Z]|^ms)/g,

        /**
         * Matches the bad prefixes left in IE9.
         * @type {RegExp}
         * @const
         */
        RX_IE_PREFIX = /^-ms-/,

    //------------------------------
    // Settings
    //------------------------------

        /**
         * The default precision to use for formatting numbers.
         * @type {number}
         * @const
         */
        DEFAULT_PRECISION = 6,

        /**
         * The default fill to use for padding strings.
         * @type {string}
         * @const
         */
        DEFAULT_FILL = " ",

        /**
         * The default alignment to use for formatting padded strings.
         * @type {string}
         * @const
         */
        DEFAULT_ALIGN = "<",

        /**
         * The default sign to use for formatting numbers.
         * @type {string}
         * @const
         */
        DEFAULT_SIGN = "-";

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
    // Padding
    //------------------------------

    /**
     * Pad a string with a leading fill character.
     * @param {string} s The string.
     * @param {string} fill The fill character.
     * @param {number} length The length to target string.
     * @return {string} The padded string.
     */
    function lpad(s, fill, length) {
        if (s.length < length) {
            s = (new Array(length + 1 - s.length)).join(fill) + s;
        }

        return s;
    }

    /**
     * Pad a string with a trailing fill character.
     * @param {string} s The string.
     * @param {string} fill The fill character.
     * @param {number} length The length of the target string.
     * @return {string} The padded string.
     */
    function rpad(s, fill, length) {
        if (s.length < length) {
            s += (new Array(length + 1 - s.length)).join(fill);
        }

        return s;
    }

    /**
     * Pad a string with leading and trailing fill character.
     * Extra padding is added as trailing.
     * @param {string} s The string.
     * @param {string} fill The fill character.
     * @param {number} length The length of the target string.
     * @return {string} The padded string.
     */
    function pad(s, fill, length) {
        if (s.length < length) {
            var size = (length - s.length) / 2;
            s = lpad("", fill, Math.floor(size)) + s +
                rpad("", fill, Math.ceil(size));
        }

        return s;
    }

    //------------------------------
    // Format
    //------------------------------

    /**
     * Format a string using the formatting spec.
     * [[fill]align][sign][#][0][minimumwidth][.precision][type]
     * @param {string|number} value The value to format.
     * @param {string} spec The formatting spec.
     * @return {string} The formatted string.
     */
    function formatSpec(value, spec) {
        if (spec) {
                // The fill|align pair.
            var fillAlign,
                // The fill character
                fill = DEFAULT_FILL,
                // The alignment character
                align = DEFAULT_ALIGN,
                // The formatting sign
                sign,
                // If numeric alternate form should be used
                alternateForm = false,
                // Thousands separator
                thousands = false,
                // If the zero pad character should be applied
                zeroPad = false,
                // The width to apply
                width,
                // Number precision or max string length
                precision,
                // The number formatting type
                type,
                // The exponent of a number being formatted
                exponent,
                // If the numeric value is negative
                isNegative = false,
                // The display sign for numeric values
                displaySign = "";

            fillAlign  = spec.match(RX_SPEC_FILL_ALIGN);
            if (fillAlign) {
                fill = fillAlign[1] || DEFAULT_FILL;
                align = fillAlign[2] || DEFAULT_ALIGN;
                spec = spec.replace(RX_SPEC_FILL_ALIGN, "");
            }

            sign = spec.match(RX_SPEC_SIGN);
            if (sign) {
                sign = sign[0];
                spec = spec.replace(RX_SPEC_SIGN, "");
            } else {
                sign = DEFAULT_SIGN;
            }

            alternateForm = spec.match(RX_SPEC_ALTERNATE);
            if (alternateForm) {
                spec = spec.replace(RX_SPEC_ALTERNATE, "");
            }

            thousands = spec.match(RX_SPEC_THOUSANDS);
            if (thousands) {
                spec = spec.replace(RX_SPEC_THOUSANDS, "");
            }

            zeroPad = spec.match(RX_SPEC_ZERO);
            if (zeroPad) {
                spec = spec.replace(RX_SPEC_ZERO, "");
                fill = "0";
                if (align !== "=") {
                    align = ">";
                }
            }

            width = spec.match(RX_SPEC_WIDTH);
            if (width) {
                width = parseInt(width[0], 10);
                spec = spec.replace(RX_SPEC_WIDTH, "");
            }

            precision = spec.match(RX_SPEC_PRECISION);
            if (precision) {
                precision = parseInt(precision[1], 10);
                spec = spec.replace(RX_SPEC_PRECISION, "");
            }

            type = spec.match(RX_SPEC_INTERGER);
            if (type) {
                type = type[0];
                spec = spec.replace(RX_SPEC_INTERGER, "");
            } else {
                type = spec.match(RX_SPEC_FLOAT);
                if (type) {
                    type = type[0];
                    spec = spec.replace(RX_SPEC_FLOAT, "");
                } else if (spec === "s") {
                    // String format
                    type = "s";
                    spec = "";
                } else {
                    // Assumed string format
                    type = "s";
                }
            }

            if (spec.length > 0) {
                throw "invalid format spec: " + spec;
            }

            if ($.isNumeric(value)) {
                if (precision === null) {
                    precision = DEFAULT_PRECISION;
                }
                isNegative = value < 0;
                value = Math.abs(value);
                exponent = parseInt(value.toExponential(precision)
                    .split("+")[1], 10);
                switch (type) {
                //------------------------------
                // Interger formatting
                //------------------------------
                // Binary
                case "b":
                    value = value.toString(2);
                    if (alternateForm) {
                        value = "0b" + value;
                    }
                    break;
                // Character
                case "c":
                    value = window.String.fromCharCode(value);
                    break;
                // Octal
                case "o":
                    value = value.toString(8);
                    if (alternateForm) {
                        value = "0o" + value;
                    }
                    break;
                // Hex
                case "x":
                    value = value.toString(16).toLowerCase();
                    if (alternateForm) {
                        value = "0x" + value;
                    }
                    break;
                // Uppercase Hex
                case "X":
                    value = value.toString(16).toUpperCase();
                    if (alternateForm) {
                        value = "0X" + value;
                    }
                    break;
                // Decimal
                case "d":
                    value = value.toString(10);
                    break;
                // Exponent notation
                case "e":
                    value = value.toExponential(precision).toString();
                    break;
                // Uppercase exponent notation
                case "E":
                    value = value.toExponential(precision).toString()
                        .toUpperCase();
                    break;
                // Fixed point
                case "f":
                case "F":
                    value = value.toFixed(precision);
                    break;
                // General formatting
                case "g":
                    if (exponent >= precision) {
                        value = value.toExponential();
                    }
                    break;
                // Uppercase general formatting
                case "G":
                    if (exponent >= precision) {
                        value = value.toExponential().toString().toUpperCase();
                    }
                    break;
                // Percent formatting (Multiply by 100, display with sign)
                case "%":
                    // Default precision for % formatting is 0
                    if (precision == DEFAULT_PRECISION) {
                        precision = 0;
                    }

                    value = (value * 100).toFixed(precision).toString() + "%";
                    break;
                // String format
                case "s":
                    value = value.toString();
                    break;
                default:
                    if ($.isNumeric(value) && value.match(RX_DIGIT)) {
                        // Interger default: Decimal (d)
                        value = value.toString(10);
                    } else {
                        // Float default: General (g)
                        if (exponent >= precision) {
                            value = value.toExponential();
                        }
                    }
                    break;
                }

                if (isNegative) {
                    displaySign = "-";
                } else {
                    switch (sign) {
                    // Always show sign
                    case "+":
                        displaySign = "+";
                        break;
                    // Show space when positive
                    case " ":
                        displaySign = " ";
                        break;
                    }
                }

                if (align === "=") {
                    value = displaySign +
                        lpad(value, fill, width - displaySign.length);
                } else {
                    value = displaySign + value;
                }

                if (thousands) {
                    value = value.replace(RX_THOUSANDS, ",");
                }
            } else if (type === "s") {
                // Apply string precision formatting
                if (precision && value.length > precision) {
                    value = value.substr(0, precision);
                }
            } else {
                throw "invalid formatting type (" + type + ") for: " +
                        $.type(value);
            }

            switch (align) {
            // Left
            case ">":
                value = lpad(value, fill, width);
                break;
            // Right
            case "<":
                value = rpad(value, fill, width);
                break;
            // Center
            case "^":
                value = pad(value, fill, width);
                break;
            }
        }

        return value;
    }

    /**
     * Perform the replacement of string fields with proper values.
     * @param {string} str The string with fields to replace.
     * @param {?Object.<string, *>} names A dict of named replacement values.
     * @param {?Array.<*>} positions A list of position replacement values.
     * @return {string} The formatted string.
     */
    function stringReplacement(str, names, positions) {
        names = names || {};

            // Flag to determine if implicit position is used
        var implicitPositioning = null,
            // The current position replacement value
            currentPosition,
            // The output string
            buffer = [];

        /**
         * Returns the value of a given field.
         * @param {string} field The field string.
         * @return {string} The unformatted value for the field.
         */
        function getValue(field) {
                // Nested keys for this value
            var keys = [],
                // The position
                position,
                // The name
                name,
                // The value to return
                value,
                // The keys
                fieldKeys = field.match(RX_KEYS) || [];

            // Extract keys
            $.each(fieldKeys, function (index, key) {
                keys.push(key.replace(RX_KEY_CLEANER, ""));
            });
            field = field.replace(RX_KEYS, "");

            // Determine spec field type
            if (field === "") {
                // Implicit numbering
                if (!implicitPositioning) {
                    implicitPositioning = true;
                    currentPosition = 0;
                }
                if (!implicitPositioning) {
                    throw "cannot mix explicit and implicit counting";
                }
                position = currentPosition++;
            } else if (field.match(RX_DIGIT)) {
                if (!implicitPositioning) {
                    implicitPositioning = false;
                }
                // Explicit numbering
                if (implicitPositioning) {
                    throw "cannot mix explicit and implicit counting";
                }
                position = parseInt(field.match(RX_DIGIT), 10);
            } else {
                // Named replacement
                name = field;
            }

            // Store the value
            if (position !== undefined && !isNaN(position)) {
                if (positions[position] !== undefined) {
                    value = positions[position];
                } else {
                    throw "field out of range";
                }
            } else if (names[name] !== undefined) {
                value = names[name];
            } else {
                throw "key error: " + name;
            }

            // Handle key expansion
            $.each(keys, function (index, key) {
                if (value[key] !== undefined) {
                    value = value[key];
                } else {
                    throw "key error: " + key;
                }
            });

            return value;
        }

        function proc() {
                // String buffers
            var field,
                spec,
                specField,
                specFieldSpec,
                // Values
                fieldValue,
                // The index of the character to detect
                charIndex,
                // The max index allowed for parsing
                charBoundary;

            charIndex = str.indexOf("{");
            if (charIndex !== -1) {
                if (str[charIndex + 1] &&
                        str[charIndex + 1] === "{") {
                    // A brace followed by a brace is an escape
                    buffer.push(str.substr(0, charIndex + 1));
                    str = str.substr(charIndex + 2);
                    return;
                }
            }

            charBoundary = str.indexOf("}");
            if (charIndex !== -1 && charBoundary === -1) {
                // This field is missing a closing brace
                throw "Single '{' encountered in format string";
            } else if (str[charBoundary + 1] &&
                    str[charBoundary + 1] === "}") {
                charIndex = str.indexOf(":");
                if (charIndex === -1 || charIndex > charBoundary + 1) {
                    // A brace followed by a brace is an escape
                    // unless it's part of a field spec
                    buffer.push(str.substr(0, charBoundary + 1));
                    str = str.substr(charBoundary + 2);
                    return;
                } else {
                    // Reset the proper index
                    charIndex = str.indexOf("{");
                }
            }

            if (charIndex === -1) {
                if (str.indexOf("}") !== -1) {
                    // No matching brace
                    throw "Single '}' encountered in format string";
                }

                // No parsing remains to be done.
                buffer.push(str);
                return false;
            }

            // Add content before a brace to the buffer
            buffer.push(str.substr(0, charIndex));
            // Trim the brace off the string
            str = str.substr(charIndex + 1);
            charBoundary = str.indexOf("}");
            if (charBoundary === -1) {
                // This field is missing a closing brace
                throw "Single '{' encountered in format string";
            }

            charIndex = str.indexOf(":");
            if (charIndex !== -1 && charIndex < charBoundary) {
                // Format spec within the field
                field = str.substr(0, charIndex);
                // Extract the field value
                fieldValue = getValue(field);
                str = str.substr(charIndex + 1);
                charBoundary = str.indexOf("}");
                spec = "";

                charIndex = str.indexOf("{");
                if (charIndex === -1 || charIndex > charBoundary) {
                    spec = str.substr(0, charBoundary);
                    str = str.substr(charBoundary + 1);
                }

                while (charIndex !== -1 && charIndex < charBoundary) {
                    // Field within the format spec
                    spec += str.substr(0, charIndex);
                    str = str.substr(charIndex + 1);
                    charBoundary = str.indexOf("}");

                    charIndex = str.indexOf(":");
                    if (charIndex !== -1 && charIndex < charBoundary) {
                        // Format spec within the field within the format spec
                        specField = str.substr(0, charIndex);
                        str = str.substr(charIndex + 1);
                        charBoundary = str.indexOf("}");

                        charIndex = str.indexOf("{");
                        if (charIndex !== -1 && charIndex < charBoundary) {
                            throw "Max string recursion exceeded";
                        }

                        specFieldSpec = str.substr(0, charBoundary);
                        str = str.substr(charBoundary + 1);
                        charBoundary = str.indexOf("}");

                        spec += formatSpec(getValue(specField), specFieldSpec);
                    } else {
                        specField = str.substr(0, charBoundary);
                        spec += getValue(specField);
                        str = str.substr(charBoundary + 1);
                        charBoundary = str.indexOf("}");
                    }

                    if (charBoundary === -1) {
                        // This field is missing a closing brace
                        throw "Single '{' encountered in format string";
                    }

                    charIndex = str.indexOf("{");
                    if (charIndex === -1 || charIndex > charBoundary) {
                        spec += str.substr(0, charBoundary);
                        str = str.substr(charBoundary + 1);
                        charBoundary = str.indexOf("}");
                    }
                }

                buffer.push(formatSpec(fieldValue, spec));
            } else {
                field = str.substr(0, charBoundary);
                str = str.substr(charBoundary + 1);
                // Extract the field value
                buffer.push(getValue(field));
            }

            return;
        };

        while (proc.call(proc) !== false) {}
        return buffer.join("");
    }

    /**
     * Format a string.
     * @param {...*} var_args Arguments to the method.
     * @return {string} The formatted string.
     */
    function format(var_args) {
        var str,
            namedValues,
            positionValues,
            args = $.makeArray(arguments);

        // Disambiguate the use of this function.
        if (args.length >= 3 && $.type(args[0]) === "boolean") {
            // collapsed; replacements provided as a single value
            str = args[1];
            if ($.isPlainObject(args[2])) {
                // function(true, str, Object, ...);
                namedValues = args[2];
                if (args.length > 3) {
                    // mixed mode; named and argument replacements
                    if (args[0] === false && $.isArray(args[3])) {
                        // function(false, str, Object, Array)
                        positionValues = args[3];
                    } else {
                        positionValues = args.slice(3);
                    }
                }
            } else if ($.isArray(args[2])) {
                // function(true, str, Array);
                positionValues = args[2];
            }
        } else {
            // expanded; position replacements provided as $.each argument
            str = args[0];
            positionValues = args.slice(1);
        }

        if (typeof str === "string") {
            return stringReplacement(str, namedValues, positionValues);
        } else {
            return "";
        }
    }

    //------------------------------
    // Truncate
    //------------------------------

    /**
     * Truncates a string.
     * @param {string} str The string.
     * @param {number} len The max length.
     * @param {boolean?} txt Use text ellispes? (... vs &hellip;)
     */
    function truncate(str, len, txt) {
        if (len === -1) {
            return str;
        }

        if (str.length > len) {
            // Find the last space before the break
            var i = str.lastIndexOf(" ", len);
            if (i === -1) {
                i = len - 1;
            }
            str = str.substr(0, i);
            str += txt ? "..." : "&hellip;";
        }

        return str;
    }

    /**
     * Textually truncates a string.
     * @param {string} str The string.
     * @param {number} len The max length.
     */
    function txtTruncate(str, len) {
        return truncate(str, len, true);
    }

    /**
     * Truncates a string and wraps the result in an HTML span with a title of
     * the name.
     * @param {string} str The string.
     * @param {number} len The max length.
     * @param {boolean?} txt Use text ellispes? (... vs &hellip;)
     */
    function wrapTruncate(str, len, el) {
        el = el || "span";
        if (str.length > len) {
            return format('<{0} title="{1}">{2}</{0}>', el || "span",
                str, truncate(str, len));
        }
    }

    //------------------------------
    //
    // Event bindings
    //
    //------------------------------

    //------------------------------
    //
    // Exposure
    //
    //------------------------------

    $.extend($, {

    //------------------------------
    // Padding
    //------------------------------

        lpad: lpad,
        rpad: rpad,
        pad: pad,

    //------------------------------
    // Format
    //------------------------------

        strf: format,

    //------------------------------
    // Truncate
    //------------------------------

        truncate: truncate,
        txtTruncate: txtTruncate,
        wrapTruncate: wrapTruncate

    });

}(window.jQuery));

