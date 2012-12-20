var ResultsView,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __hasProp = Object.prototype.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor; child.__super__ = parent.prototype; return child; };

ResultsView = (function(_super) {

  __extends(ResultsView, _super);

  function ResultsView() {
    this.afterRender = __bind(this.afterRender, this);
    this.updateOptions = __bind(this.updateOptions, this);
    this.detectTablets = __bind(this.detectTablets, this);
    ResultsView.__super__.constructor.apply(this, arguments);
  }

  ResultsView.prototype.events = {
    'click .cloud': 'cloud',
    'click .csv': 'csv',
    'click .tablets': 'tablets',
    'click .detect': 'detectOptions',
    'click .details': 'showResultSumView',
    'click .csv_beta': 'csvBeta'
  };

  ResultsView.prototype.csvBeta = function() {
    var filename;
    filename = this.assessment.get("name");
    return document.location = "/" + Tangerine.db_name + "/_design/" + Tangerine.design_doc + ("/_list/csv/csvRowByResult?key=\"" + this.assessment.id + "\"&filename=" + filename);
  };

  ResultsView.prototype.showResultSumView = function(event) {
    var result;
    result = new Result({
      _id: $(event.target).attr("data-result-id")
    });
    return result.fetch({
      success: function() {
        var view;
        view = new ResultSumView({
          model: result,
          finishCheck: true
        });
        view.render();
        return $(event.target).siblings().last().html(view.el);
      }
    });
  };

  ResultsView.prototype.cloud = function() {
    var _this = this;
    if (this.available.cloud.ok) {
      $.couch.replicate(Tangerine.settings.urlDB("local", Tangerine.settings.urlDB("group", {
        success: function() {
          return _this.$el.find(".status").find(".info_box").html("Results synced to cloud successfully");
        },
        error: function(a, b) {
          return _this.$el.find(".status").find(".info_box").html("<div>Sync error</div><div>" + a + " " + b + "</div>");
        }
      }, {
        doc_ids: this.docList
      })));
    } else {
      Utils.midAlert("Cannot detect cloud");
    }
    return false;
  };

  ResultsView.prototype.tablets = function() {
    var ip, _fn, _i, _len, _ref,
      _this = this;
    if (this.available.tablets.okCount > 0) {
      _ref = this.available.tablets.ips;
      _fn = function(ip) {
        return $.couch.replicate(Tangerine.settings.urlDB("local", Tangerine.settings.urlSubnet(ip, {
          success: function() {
            return _this.$el.find(".status").find(".info_box").html("Results synced to " + _this.available.tablets.okCount + " successfully");
          },
          error: function(a, b) {
            return _this.$el.find(".status").find(".info_box").html("<div>Sync error</div><div>" + a + " " + b + "</div>");
          }
        }, {
          doc_ids: _this.docList
        })));
      };
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        ip = _ref[_i];
        _fn(ip);
      }
    } else {
      Utils.midAlert("Cannot detect tablets");
    }
    return false;
  };

  ResultsView.prototype.csv = function() {
    var view,
      _this = this;
    this.$el.find("button.csv").html("Preparing CSV...");
    view = new CSVView({
      assessmentId: this.assessment.id
    });
    view.render();
    return view.on("ready", function() {
      var $button, csvLocation, filename;
      filename = _this.assessment.get("name") + "-" + moment().format("YYYY-MMM-DD HH:mm");
      csvLocation = Tangerine.settings.urlShow("local", "csv/Tangerine-" + (_this.assessment.id.substr(-5, 5)) + ".csv?filename=" + filename);
      $button = _this.$el.find("button.csv");
      $button.after("<a href='" + csvLocation + "' class='command'>Download CSV</a>");
      return $button.remove();
    });
  };

  ResultsView.prototype.initDetectOptions = function() {
    return this.available = {
      cloud: {
        ok: false,
        checked: false
      },
      tablets: {
        ips: [],
        okCount: 0,
        checked: 0,
        total: 256
      }
    };
  };

  ResultsView.prototype.detectOptions = function() {
    this.detectCloud();
    return this.detectTablets();
  };

  ResultsView.prototype.detectCloud = function() {
    var _this = this;
    return $.ajax({
      dataType: "jsonp",
      url: Tangerine.settings.urlHost("group"),
      success: function(a, b) {
        return _this.available.cloud.ok = true;
      },
      error: function(a, b) {
        return _this.available.cloud.ok = false;
      },
      complete: function() {
        _this.available.cloud.checked = true;
        return _this.updateOptions();
      }
    });
  };

  ResultsView.prototype.detectTablets = function() {
    var local, _results,
      _this = this;
    _results = [];
    for (local = 0; local <= 255; local++) {
      _results.push((function(local) {
        var ip;
        ip = Tangerine.settings.subnetIP(local);
        return $.ajax({
          dataType: "jsonp",
          contentType: "application/json;charset=utf-8",
          timeout: 30000,
          url: urlSubnet(ip),
          complete: function(xhr, error) {
            _this.available.tablets.checked++;
            if (xhr.status === 200) {
              _this.available.tablets.okCount++;
              _this.available.tablets.ips.push(ip);
            }
            return _this.updateOptions();
          }
        });
      })(local));
    }
    return _results;
  };

  ResultsView.prototype.updateOptions = function() {
    var message, percentage, tabletMessage;
    percentage = Math.decimals((this.available.tablets.checked / this.available.tablets.total) * 100, 2);
    if (percentage === 100) {
      message = "finished";
    } else {
      message = "" + percentage + "%";
    }
    tabletMessage = "Searching for tablets: " + message;
    if (this.available.tablets.checked > 0) {
      this.$el.find(".checking_status").html("" + tabletMessage);
    }
    if (this.available.cloud.checked && this.available.tablets.checked === this.available.tablets.total) {
      this.$el.find(".status .info_box").html("Done detecting options");
      this.$el.find(".checking_status").hide();
    }
    if (this.available.cloud.ok) {
      this.$el.find('button.cloud').removeAttr('disabled');
    }
    if (this.available.tablets.okCount > 0 && percentage === 100) {
      return this.$el.find('button.tablets').removeAttr('disabled');
    }
  };

  ResultsView.prototype.readyCSVBeta = function() {
    var _this = this;
    return $.ajax({
      dataType: "json",
      contentType: "application/json;charset=utf-8",
      url: "http://localhost:5984/tangerine/_design/tangerine/_list/csvHeaders/csvRowByResult",
      data: {
        key: "\"" + this.assessment.id + "\""
      },
      success: function(data) {
        var $button;
        $button = _this.$el.find(".csv_beta");
        $button.removeAttr("disabled");
        $button.html("CSV");
        return _this.columnHeaders = data;
      }
    });
  };

  ResultsView.prototype.initialize = function(options) {
    var result, _i, _len, _ref;
    this.subViews = [];
    this.results = options.results;
    this.assessment = options.assessment;
    this.docList = [];
    _ref = this.results;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      result = _ref[_i];
      this.docList.push(result.get("id"));
    }
    this.initDetectOptions();
    return this.detectCloud();
  };

  ResultsView.prototype.render = function() {
    var cloudButton, csvButton, html, tabletButton, _ref,
      _this = this;
    this.clearSubViews();
    cloudButton = "<button class='cloud command' disabled='disabled'>Cloud</button>";
    tabletButton = "<button class='tablets command' disabled='disabled'>Tablets</button>";
    csvButton = "<button class='csv command'>CSV</button>";
    html = "      <h1>" + (this.assessment.get('name')) + "</h1>      <h2>Save options</h2>      <div class='menu_box'>        " + (Tangerine.settings.get("context") === "mobile" ? cloudButton : "") + "        " + (Tangerine.settings.get("context") === "mobile" ? tabletButton : "") + "        " + csvButton + "        <button class='command csv_beta'>CSV (beta)</button>      </div>";
    if (Tangerine.settings.get("context") === "mobile") {
      html += "        <button class='detect command'>Detect options</button>        <div class='status'>          <h2>Status</h2>          <div class='info_box'></div>          <div class='checking_status'></div>        </div>        ";
    }
    html += "      <h2 id='results-header'>Results (loading)</h2>    ";
    this.$el.html(html);
    if (((_ref = this.results) != null ? _ref.length : void 0) === 0) {
      $('#results-header').html("No results yet!");
    } else {
      $.couch.db(Tangerine.db_name).view("" + Tangerine.design_doc + "/resultSummaryByAssessmentId", {
        key: this.assessment.id,
        descending: true,
        success: function(result) {
          var maxResults, row, rowsRendered;
          $('#results-header').html("Results (" + result.rows.length + ")");
          maxResults = 500;
          if (result.rows.length > maxResults) {
            $('#results-header').html("Results (" + result.rows.length + ") - more than " + maxResults + " results, use CSV for analysis");
            return;
          }
          rowsRendered = (function() {
            var _i, _len, _ref2, _results;
            _ref2 = result.rows;
            _results = [];
            for (_i = 0, _len = _ref2.length; _i < _len; _i++) {
              row = _ref2[_i];
              _results.push("              <div>                " + (row.value.participant_id ? row.value.participant_id : "") + "                " + (row.value.end_time ? moment(row.value.end_time).format('YYYY-MMM-DD HH:mm') + "(" + moment(row.value.end_time).fromNow() + ")" : "") + "                <button data-result-id='" + row.id + "' class='details command'>details</button>                <div></div>              </div>            ");
            }
            return _results;
          })();
          return _this.$el.append(rowsRendered.join(""));
        }
      });
    }
    return this.trigger("rendered");
  };

  ResultsView.prototype.afterRender = function() {
    var view, _i, _len, _ref, _results;
    _ref = this.subViews;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      view = _ref[_i];
      _results.push(typeof view.afterRender === "function" ? view.afterRender() : void 0);
    }
    return _results;
  };

  ResultsView.prototype.clearSubViews = function() {
    var view, _i, _len, _ref;
    _ref = this.subViews;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      view = _ref[_i];
      view.close();
    }
    return this.subViews = [];
  };

  return ResultsView;

})(Backbone.View);
