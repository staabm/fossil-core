define([
    'fossil/core',
    'fossil/mixins/observable',
    'underscore',
    'backbone'
], function (Fossil, Events, _, Backbone) {

    Fossil.Services = {};

    var Service = Fossil.Service = function (options) {
        this.options = _.extend({}, this.options, options || {});
        this.registerEvents();
        this.initialize.apply(this, arguments);
    };

    _.extend(Service.prototype, Fossil.Mixins.Observable, {
        // default options
        options: {
            // default configuration for service exposure
            expose: false,
            // default configuration for service link
            link: false,
            // should there be a shortlink on application
            // this would make service available under application[serviceid]
            // to avoid conflic this MUST be set by user.
            linkToApplication: null,
            // should the service be exposed  to module context ?
            // an exposed service will be available under module.services[serviceid]
            exposeToModule: null,
            // should there be a shortlink on module
            // this would make service available under module[serviceid]
            // to avoid conflic this MUST be set by user.
            linkToModule: null,
            // should the service be exposed  to fragement context ?
            // an exposed service will be available under fragement.services[serviceid]
            exposeToFragment: null,
            // should there be a shortlink on fragement
            // this would make service available under fragement[serviceid]
            // to avoid conflic this MUST be set by user.
            linkToFragment: null
        },
        // A hook to initialize service,
        // after application and modules are initialized.
        initialize: function (options) {
        },

        // activate Service for application
        activateApplication: function (application, id) {
            var service = this;
            this.prefixEvent = _.bind(prefixEvent, this, id);
            if (processConfig(this, 'linkToApplication', 'link')) {
                application[id] = this;
            }

            // create pubSub
            this.application = application.createPubSub(this, 'applicationEvents');
            // activate application
            this._doActivateApplication(application);
            // activate all modules
            _.each(application.getModule(), function (module) {
                service.activateModule.call(service, module, application, id);
            });
            // register on new module connection
            this.listenTo(application, 'module:connect', _.bind(this.activateModuleListener, this, id));
            this.listenTo(application, 'fragmentable:fragment:setup', _.bind(this.activateFragmentListener, this, id));
            // tell the world we're ready
            application.trigger(this.prefixEvent('ready'), this);
        },
        // unplug for application
        suspendApplication: function (application, id) {
            var service = this;
            // suspend for every application modules
            _.each(application.getModule(), function (module) {
                service.suspendModule.call(service, module, application, id);
            });
            if (processConfig(this, 'linkToApplication', 'link')) {
                application[id] = null;
            }
            // remove event handler
            this.stopListening();
            // remove pubsub reference
            this.application = null;
            // finally suspend for application
            this._doSuspendApplication(application);
        },

        activateModule: function (module, application, id) {
            if (!module.services) {
                // module isn't booted yet.
                return ;
            }
            if (processConfig(this, 'exposeToModule', 'expose')) {
                module.services[id] = this;
            }
            if (processConfig(this, 'linkToModule', 'link')) {
                module[id] = this;
            }
            this._doActivateModule.apply(this, arguments);
            this.listenTo(module, 'fragmentable:fragment:setup', _.bind(this.activateFragmentListener, this, id));
            module.trigger(this.prefixEvent('ready'), this);
        },
        suspendModule: function (module, application, id) {
            if (processConfig(this, 'exposeToModule', 'expose')) {
                module.services[id] = null;
            }
            if (processConfig(this, 'linkToModule', 'link')) {
                module[id] = null;
            }
            this._doSuspendModule.apply(this, arguments);
        },
        activateModuleListener: function (id, module, path, application) {
            this.activateModule(module, application, id);
        },

        activateFragment: function (fragment, parent, id) {
            if (!fragment.services) {
                // fragment isn't booted yet.
                return ;
            }
            if (processConfig(this, 'exposeToFragment', 'expose')) {
                fragment.services[id] = this;
            }
            if (processConfig(this, 'linkToFragment', 'link')) {
                fragment[id] = this;
            }
            this._doActivateFragment.apply(this, arguments);
            this.listenTo(fragment, 'fragmentable:fragment:setup', _.bind(this.activateFragmentListener, this, id));
            fragment.trigger(this.prefixEvent('ready'), this);
        },
        suspendFragment: function (fragment, parent, id) {
            if (processConfig(this, 'exposeToFragment', 'expose')) {
                fragment.services[id] = null;
            }
            if (processConfig(this, 'linkToFragment', 'link')) {
                fragment[id] = null;
            }
            this._doSuspendFragment.apply(this, arguments);
        },
        activateFragmentListener: function (id, fragment, parent) {
            this.activateFragment(fragment, parent, id);
        },

        // activate service on application.
        // this method has to be overriden with the service logic.
        _doActivateApplication: function (application) {
        },
        // activate service on module.
        // this method has to be overriden with the service logic.
        _doActivateModule: function (module, application) {
        },
        // activate service on fragment.
        // this method has to be overriden with the service logic.
        _doActivateFragment: function (fragment, parent) {
        },
        // suspend service on application.
        // this method has to be overriden with the service logic.
        _doSuspendApplication: function (application) {
        },
        // suspend service on module.
        // this method has to be overriden with the service logic.
        _doSuspendModule: function (module, application) {
        },
        // suspend service on fragment.
        // this method has to be overriden with the service logic.
        _doSuspendFragment: function (fragment, parent) {
        }
    });

    function prefixEvent (id, event) {
        return ['service', id, event].join(':');
    }

    function processConfig(service, prop, defaultProp) {
        prop = _.result(service.options, prop);
        if (prop !== null) {
            return prop;
        }

        return _.result(service.options, defaultProp);
    }

    Service.extend = function () {
        var options = this.prototype.options;
        var child = Backbone.Model.extend.apply(this, arguments);
        child.prototype.options = _.extend({}, this.prototype.options, child.prototype.options ||{});
        return child;
    };

    return Service;
});
