/**
 * jQuery update
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

        /**
         * A list of HTMLElements to create simple templates for.
         * @type {Array<string>}
         */
    var ELEM_TEMPLATES = ["a", "li"],

        /**
         * Attributes to clear when melding.
         * @type {Array<string>}
         */
        CLEAR_ATTRS = ["data-instance", "data-section"],

    //------------------------------
    //
    // Properties
    //
    //------------------------------

    //------------------------------
    // Templates
    //------------------------------

        /**
         * A collection of named templates.
         * @type {Object<string, jQuery>}
         */
        templates = {},

        /**
         * UID for autotemplates.
         * @type {number}
         */
        uid = 0;

    //------------------------------
    //
    // Methods
    //
    //------------------------------

    //------------------------------
    // Update
    //------------------------------

    /**
     * Updates an element.
     * @param {Object<string, ?>} changes Each key should map to a method on
     *  the "jQuery.fn" object. The values are dependent on the expected
     *  inputs of the method being called.
     *  {
     *      text: "Hello, World!"
     *  }
     *
     *  The changes object can also be nested inside a larger object which uses
     *  selectors for keys.
     *  {
     *      ".foo": {
     *          text: "Hello, World!"
     *      }
     *  }
     * @param {string|jQuery} element The element being updated.
     * @param {number=} index For template containers, this specifies the index
     *  of the template to update.
     * @param {string?} prefix A selector prefix to add to all lookups.
     * @return {jQuery} The element(s) updated.
     */
    function update(changes, element, index, prefix) {
        if (!$.isPlainObject(changes) && typeof changes === "number") {
            // Passed in only an index; shorthand for just creating a template
            index = changes;
            changes = {};
        }

        if (!changes) {
            return $();
        }


        element = $(element);
        if (element.length === 0) {
            element = $("body");
        }

        var r = $(),
            t,
            p,
            instances,
            hasUpdate = false,
            ci,
            createdInstances,
            selector;

        // Call this method if we have more than one element selected.
        if ($.isArray(element)) {
            $.each(element, function (i, e) {
                r = r.add(update(changes, e, index));
            });
        } else if (element.length > 0) {
            t = element.attr("data-template");
            selector = "> [data-template-source='" + t + "']";

            // Create templates if needed
            if ($.isNumeric(index) && t !== undefined) {
                instances = index + 1 - $(selector, element).length;
                if (instances > 0) {
                    if (templates[t] === undefined) {
                        throw t + " is not a valid template";
                    }
                    t = templates[t];
                    if (instances > 0) {
                        createdInstances = [];
                    }
                    while (instances > 0) {
                        ci = t.clone(true).hide();
                        createdInstances.push(ci);
                        element.append(ci);
                        if ($.localized) {
                            ci.localize();
                        }
                        instances -= 1;
                    }
                }
                element = $(selector, element).eq(index)
                    .show().addClass("active-template");
            }

            // Assume a single string is just a text (as html) set
            if ($.type(changes) === "string") {
                changes = {html: changes};
            }

            // Given both add and remove classes, always remove first
            if (changes.removeClass && changes.addClass) {
                element.removeClass(changes.removeClass);
                delete element.removeClass;
            }

            $.each(changes, function (k, v) {
                var e;
                if (!$.fn[k]) {
                    e = $((!prefix ? "" : prefix) + k, element);
                    if (element.is(k)) {
                        e = e.add(element);
                    }
                    if (e.length > 0) {
                        // Convert to string to prevent numbers with prefix
                        // from being interpreted as indexes for shorthand
                        if ($.isNumeric(v)) {
                            v = "" + v;
                        }

                        // Call set again using the value as the new changeset
                        r = r.add(update(v, e, index, prefix));
                    }
                } else {
                    element[k](v);
                    hasUpdate = true;
                }
            });

            if (hasUpdate) {
                if (element.is(selector)) {
                    element.show();
                }

                p = element.parents(selector).show();
                if (p.length > 0) {
                    r = r.add(p);
                } else {
                    r = r.add(element);
                }
            } else if (createdInstances !== undefined) {
                $.each(createdInstances, function (i, v) {
                    r = r.add(v);
                    v.show();
                });
            } else if ($.isEmptyObject(changes) && element) {
                r = r.add(element);
            }
        }

        if ($.markup) {
            $.markup.queue.fire(r);
        }

        return $.unique(r);
    }

    //------------------------------
    // Templates
    //------------------------------

    /**
     * Creates a template.
     * @param {string} name The name of the template.
     * @param {DOMElement|jQuery} template The template's root DOM element.
     * @param {string|jQuery=} element The element(s) using this template.
     */
    function createTemplate(name, template, element) {
        if (templates[name] !== undefined) {
            throw name + " is already a template";
        }
        templates[name] = template = $(template).addClass("template")
                .attr("data-template-source", name);
        $(element).attr("data-template", name);
    }

    /**
     * Gets all the templates within a context.
     * @param {string|jQuery=} element
     * @param {string} template The name of the template to get.
     * @param {number} index The index of the template to get.
     * @return {jQuery} The template.
     */
    function templateInstance(element, template, index) {
        if (template === undefined) {
            template = "> .template";
        } else {
            template = "> [data-template-source='" + template + "']";
        }

        var e = $(template, element);

        if (index !== undefined) {
            index = parseInt(index, 10);
            if (!isNaN(index)) {
                e = e.eq(index);
            }
        }

        return e;
    }

    /**
     * Resets all the templates within a context.
     * @param {string|jQuery=} element
     * @param {string} template The name of the template to reset.
     * @param {number} index The index of the template to reset.
     * @return {jQuery} The templates reset.
     */
    function resetTemplate(element, template, index) {
        return templateInstance(element, template, index)
            .hide().removeClass("active-template");
    }

    //------------------------------
    // Setup
    //------------------------------

    function extractTemplates(context) {
        var innerSel = "[data-template='*']:not(.extracted-tpl)",
            defSel = "[data-template-def]:not(.extracted-tpl)",
            e = $(innerSel, context),
            d = $(defSel, context);

        if (context !== undefined && context.is(innerSel)) {
            e = e.add(context);
        }

        if (context !== undefined && context.is(defSel)) {
            d = d.add(context);
        }

        e.each(function () {
            var e = $(this),
                c = e.children(),
                name = "auto_tpl_";

            if (c.length) {
                name += uid++;
                extractTemplates(c);
                e.createTemplate(name, c.detach().addClass("extracted-tpl"));
            }
        });

        d.each(function () {
            var e = $(this),
                name = e.data("templateDef"),
                c = e.children();

            if (!e.is(".template") && name) {
                extractTemplates(c);
                instantiateTemplate(c);
                createTemplate(name, e.detach().addClass("extracted-tpl"));
            }
        });

        instantiateTemplate(context);

    }

    function resolveParentTemplate(e) {
        var t;
        if (e.is("[data-template]")) {
            t = e.data("template");
        } else {
            t = e.parents("[data-template]").data("template");
        }

        if (!t) {
            t = e.parents("[data-instance]").data("instance");
            if (t) {
                e = templates[t];
                if (e.length) {
                    return resolveParentTemplate(e);
                }
            }
        }

        return t;
    }

    function instantiateTemplate(context) {
        $("[data-instance]", context).each(function () {
            var e = $(this).extractTemplates(),
                t = e.data("instance"),
                s = e.find("[data-section]").detach(),
                c = e.children().detach(),
                ti,
                cc;

            if (t === ".") {
                t = resolveParentTemplate(e);
                e.attr("data-instance", t);
            }

            ti = makeTemplate(t, e, true);
            s.each(function () {
                var st = $(this),
                    se = ti.find(st.data("section"));
                if (se.length === 0) {
                    // This may be for a higher template
                    st.appendTo(ti);
                }
                meldElements(se, st, true);
                se.append(st.contents().clone(true));
            });

            // Find the default child container
            cc = ti.find(".inject-content");
            if (cc.length === 0) {
                cc = ti;
            } else {
                cc = cc.removeClass("inject-content").eq(0);
            }

            cc.append(c);

            if ($.localized) {
                ti.localize();
            }

            e.replaceWith(ti);
        });
    }

    /**
     * Melds two elements together.
     * @param {jQuery} e The element to be melded.
     * @param {jQuery} merger The element to meld into it.
     */
    function meldElements(t, e, ignoreLoc) {
        var a = e.getAttributes(),
            c = t.attr("class") || "";

        // Merge classes
        if (c) {
            if (a["class"]) {
                a["class"] += (" " + c);
            } else {
                a["class"] = c;
            }
        }

        $.each(CLEAR_ATTRS, function (i, v) {
            delete a[v];
        });

        if (a["class"]) {
            a["class"] = $.unique(a["class"].split(" ")).join(" ");
        }

        t.attr(a);

        if ($.localized && !ignoreLoc) {
            t.localize();
        }

        return t;
    }

    /**
     * Makes a template.
     * @param {string} t The name of the template.
     * @param {jQuery} e The element to merge with.
     */
    function makeTemplate(t, e, ignoreLoc) {
        if (templates[t] === undefined) {
            throw t + " is not a valid template";
        }
        if (e) {
            return meldElements(templates[t].clone(true), e, ignoreLoc);
        } else {
            return templates[t].clone(true);
        }
    }

    /**
     * Replaces the element with a template instance.
     * @param {jQuery} t The template instance.
     */
    function replaceWithTemplate(t) {
        var resp = [];
        this.each(function () {
            var e = $(this),
                ti = makeTemplate(t, e);
            e.replaceWith(ti);
            resp.push(ti);
        });

        return $(resp);
    }

    /**
     * Gets all defined attributes for an element. Used with jQuery.fn.
     */
    function getAttributes() {
        var attributes = {};
        if (this.length) {
            $.each(this[0].attributes, function(index, attr) {
                attributes[attr.name] = attr.value;
            });
        }
        return attributes;
    }

    //------------------------------
    // Startup
    //------------------------------

    function startup() {
        // Create default templates
        $.each(ELEM_TEMPLATES, function (i, v) {
            createTemplate(v, $(["<", v, "/>"].join("")));
        });
        createTemplate("lia", $("<li/>").append($("<a/>")));

        extractTemplates();

        // Markup
        if ($.markup) {
            $.markup.queue.add(extractTemplates);
        }
    }

    //------------------------------
    //
    // Exposure
    //
    //------------------------------

    $.extend($, {

    //------------------------------
    // Update
    //------------------------------

        update: update,

    //------------------------------
    // Templates
    //------------------------------

        templates: templates,
        createTemplate: createTemplate,
        templateInstance: templateInstance,
        resetTemplate: resetTemplate,
        makeTemplate: makeTemplate,
        meldElements: meldElements

    });

    $.extend($.fn, {

    //------------------------------
    // Utility
    //------------------------------

        getAttributes: getAttributes,
        replaceWithTemplate: replaceWithTemplate,
        meldWith: function (e) {
            return this.each(function () {
                meldElements($(this), e);
            });
        },

    //------------------------------
    // Update
    //------------------------------

        update: function (values, instance, prefix) {
            var r = $();
            this.each(function () {
                r = r.add(update(values, $(this), instance, prefix));
            });
            return $.unique(r);
        },

    //------------------------------
    // Template
    //------------------------------

        extractTemplates: function () {
            extractTemplates(this);
            return this;
        },

        templateContainer: function () {
            return this
                .attr("data-template", "*")
                .extractTemplates();
        },

        createTemplate: function (name, template) {
            createTemplate(name, template, this);
            return this;
        },

        resetTemplate: function (template, index) {
            resetTemplate(this, template, index);
            return this;
        },

        resetTemplateInstance: function (index) {
            return resetTemplate(this, undefined, index);
        },

        getTemplate: function (template, index) {
            return templateInstance(this, template, index);
        },

        templateInstance: function (index) {
            return templateInstance(this, undefined, index);
        },

        activeTemplates: function (template) {
            return templateInstance(this, template).filter(".active-template");
        }

    });

    //------------------------------
    // Startup
    //------------------------------

    $.beforeFirstExtract = $.Callbacks("unique");
    if ($.localized) {
        $.localized(startup);
        $(function () {
            $.beforeFirstExtract.fire();
            extractTemplates();
        });
    } else {
        $(function () {
            $.beforeFirstExtract.fire();
            startup();
        });
    }

}(window.jQuery));

