// Generated by CoffeeScript 1.4.0
var MessageView,
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

MessageView = (function(_super) {

  __extends(MessageView, _super);

  function MessageView() {
    return MessageView.__super__.constructor.apply(this, arguments);
  }

  MessageView.prototype.className = "MessageView";

  MessageView.prototype.initialize = function(options) {
    return this.model = options.model;
  };

  MessageView.prototype.render = function() {
    this.$el.html("      <label for='to'>To</label>      <select id='name'></select>    ");
    return this.trigger("rendered");
  };

  return MessageView;

})(Backbone.View);
