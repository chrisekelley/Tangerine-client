var Template,
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

Template = (function(_super) {

  __extends(Template, _super);

  function Template() {
    Template.__super__.constructor.apply(this, arguments);
  }

  Template.prototype.url = "template";

  return Template;

})(Backbone.Model);