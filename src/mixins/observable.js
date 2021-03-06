define([
    'fossil/core',
    'underscore',
    'backbone'
], function (Fossil, _, Backbone) {

    var exposedPubsubProperties = ['_listenerId', 'createPubSub'].concat(_.keys(Backbone.Events));

    var Eventable = Fossil.Mixins.Observable = _.extend({}, Backbone.Events, {
        registerEvents: function () {
            var events = _.extend(
                {},
                _.result(this, 'events'),
                _.result(this.options || {}, 'events')
            );
            var observable = this;

            _.each(events, function (method, eventid) {
                // create callback from method
                // if it is not a function already, it should be a method
                if (!_.isFunction(method)) {
                    method = observable[method];
                }
                observable.listenTo(observable, eventid, _.bind(method, observable));
            });
        },

        // expose application's PubSub to plug it in application.
        createPubSub: function (observer, property) {
            var pubsub = {}, observable = this;
            _.each(exposedPubsubProperties, function (property) {
                if (_.isFunction(observable[property])) {
                    pubsub[property] = _.bind(observable[property], observable);
                } else {
                    pubsub[property] = observable[property];
                }
            });

            // in case there is no observer
            if (!observer) {return pubsub;}

            var events = _.extend(
                {},
                _.result(observer, property),
                _.result(observer.options || {}, property)
            );

            _.each(events, function (method, eventid) {
                // create callback from method
                // if it is not a function already, it should be a method
                if (!_.isFunction(method)) {
                    method = observer[method];
                }
                observable.listenTo(observable, eventid, _.bind(method, observer));
            });

            return pubsub;
        }
    });

    return Eventable;
});
