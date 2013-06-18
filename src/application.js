define([
    'fossil/core',
    'jquery',
    'underscore',
    'backbone',
    'fossil/mixins/events',
    'fossil/mixins/layout',
    'fossil/mixins/elementable',
    'fossil/mixins/fragmentable'
], function (Fossil, $, _, Backbone) {

    var messages = {
        unknown_module: _.template("Unknown module at \"<%- path %>\".")
    };

    var Application = Fossil.Application = function (options) {
        this.options = options || {};
        this.registerEvents();
        initFactories(this);
        // init fragmentable
        this.initFragmentable();
        initModules(this);
        this.initialize.apply(this, arguments);
    };

    _.extend(Application.prototype,
        Fossil.Mixins.Events,
        Fossil.Mixins.Elementable,
        Fossil.Mixins.Layout,
        Fossil.Mixins.Fragmentable, {
            // default selector for application to append to.
            selector: 'body',
            currentModule: null,
            template: '<div data-fossil-placeholder="module"></div>',
            initialize: function () {
            },

            // connect an module at given subpath
            connect: function (path, module) {
                if (_.isFunction(module)) {
                    module = new module(this, path);
                }
                this.modules[path] = module;
                this.trigger('module:connect', module, path, this);

                return this;
            },
            // retreive an module from it's path
            // or returns all modules if no path is given.
            getModule: function (path) {
                if (typeof path === "undefined") {
                    return this.modules;
                }
                if (this.modules[path]) {
                    return this.modules[path];
                }

                throw new Error(messages.unknown_module({path: path}));
            },

            // use a factory
            use: function (id, factory) {
                if (_.isFunction(factory)) {
                    factory = new factory();
                }
                // suspend previously registered factory with this name
                if (this.factories[id]) {
                    this.factories[id].suspendApplication(this, id);
                }
                factory.activateApplication(this, id);
                this.factories[id] = factory;
                this.trigger('factory:use', factory, id, this);

                return this;
            },

            start: function () {
                this.trigger('setup', this);
                this.setElement($(this.selector));
                this.renderLayout();
                this.renderFragments();
                this.trigger('start', this);
            },
            switchModule: function (module) {
                var moduleChange = (this.currentModule !== module);
                if (moduleChange && this.currentModule) {
                    this.trigger('module:teardown', this.currentModule);
                    this.currentModule.detachElement();
                }
                if (moduleChange) {
                    var $el = this.$('[data-fossil-placeholder=module]');
                    this.trigger('module:change', this.currentModule, module);
                    module.setElement($el);
                    this.trigger('module:setup', module);
                }
                this.currentModule = module;
            }
    });

    function initFactories (application) {
        var factories = _.extend(
            {},
            application.factories || {},
            application.options.factories || {}
        );
        application.factories = {};
        _.each(factories, function (factory, id) {
            application.use(id, factory);
        });
    }

    function initModules (application) {
        var apps = _.extend(
            {},
            application.modules || {},
            application.options.modules || {}
        );
        application.modules = {};
        _.each(apps, function (module, path) {
            application.connect(path, module);
        });
    }

    Application.extend = Backbone.Model.extend;

    return Application;
});
