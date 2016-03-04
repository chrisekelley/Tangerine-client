Tangerine.bootSequence = {
  basicConfig: function(callback) {

    /*
    Pouch configuration
     */
    Tangerine.db = new PouchDB(Tangerine.conf.db_name);
    Backbone.sync = BackbonePouch.sync({
      db: Tangerine.db,
      fetch: 'view',
      view: 'tangerine/byCollection',
      viewOptions: {
        include_docs: true
      }
    });
    Backbone.Model.prototype.idAttribute = '_id';
    _.templateSettings = {
      interpolate: /\{\{(.+?)\}\}/g
    };
    return callback();

    /*
    Tangerine.db.destroy (error) ->
      return alert error if error?
    
      Tangerine.db = new PouchDB("tangerine")
      Backbone.sync = BackbonePouch.sync
        db: Tangerine.db
    
    
      callback()
     */
  },
  checkDatabase: function(callback) {
    var db;
    db = Tangerine.db;
    return db.get("initialized", function(error, doc) {
      if (!error) {
        return callback();
      }
      console.log("initializing database");
      return db.put({
        _id: "_design/" + Tangerine.conf.design_doc,
        views: {

          /*
            Used for replication.
            Will give one key for all documents associated with an assessment or curriculum.
           */
          byDKey: {
            map: (function(doc) {
              var id;
              if (doc.collection === "result") {
                return;
              }
              if (doc.curriculumId) {
                id = doc.curriculumId;
                if (doc.collection === "klass") {
                  return;
                }
              } else {
                id = doc.assessmentId;
              }
              return emit(id.substr(-5, 5), null);
            }).toString()
          },
          byCollection: {
            map: (function(doc) {
              var result;
              if (!doc.collection) {
                return;
              }
              emit(doc.collection, null);
              if (doc.collection === 'subtest') {
                return emit("subtest-" + doc.assessmentId);
              } else if (doc.collection === 'question') {
                return emit("question-" + doc.subtestId);
              } else if (doc.collection === 'result') {
                result = {
                  _id: doc._id
                };
                doc.subtestData.forEach(function(subtest) {
                  if (subtest.prototype === "id") {
                    result.participantId = subtest.data.participant_id;
                  }
                  if (subtest.prototype === "complete") {
                    return result.endTime = subtest.data.end_time;
                  }
                });
                result.startTime = doc.start_time;
                return emit("result-" + doc.assessmentId, result);
              }
            }).toString()
          }
        }
      }).then(function() {
        var doOne, packNumber;
        packNumber = 0;
        doOne = function() {
          var paddedPackNumber;
          paddedPackNumber = ("0000" + packNumber).slice(-4);
          return $.ajax({
            dataType: "json",
            url: "js/init/pack" + paddedPackNumber + ".json",
            error: function(res) {
              if (res.status === 404) {
                return db.put({
                  "_id": "initialized"
                }).then(function() {
                  return callback();
                });
              }
            },
            success: function(res) {
              packNumber++;
              return db.bulkDocs(res.docs, function(error, doc) {
                if (error) {
                  return alert("could not save initialization document: " + error);
                }
                return doOne();
              });
            }
          });
        };
        return doOne();
      });
    });
  },
  versionTag: function(callback) {
    $("#footer").append("<div id='version'>" + Tangerine.version + "-" + Tangerine.buildVersion + "</div>");
    return callback();
  },
  fetchSettings: function(callback) {
    Tangerine.settings = new Settings({
      "_id": "settings"
    });
    return Tangerine.settings.fetch({
      success: callback,
      error: function() {
        return Tangerine.settings.save(Tangerine.defaults.settings, {
          error: function() {
            console.error(arguments);
            return alert("Could not save default settings");
          },
          success: callback
        });
      }
    });
  },
  guaranteeInstanceId: function(callback) {
    if (!Tangerine.settings.has("instanceId")) {
      return Tangerine.settings.save({
        "instanceId": Utils.humanGUID()
      }, {
        error: function() {
          return alert("Could not save new Instance Id");
        },
        success: callback
      });
    } else {
      return callback();
    }
  },
  documentReady: function(callback) {
    return $(function() {
      return callback();
    });
  },
  loadI18n: function(callback) {
    return i18n.init({
      fallbackLng: "en-US",
      lng: Tangerine.settings.get("language"),
      resStore: Tangerine.locales
    }, function(err, t) {
      window.t = t;
      return callback();
    });
  },
  handleCordovaEvents: function(callback) {
    var error, error1;
    document.addEventListener("deviceready", function() {
      console.log("deviceread event fired.");
      document.addEventListener("online", function() {
        return Tangerine.online = true;
      });
      document.addEventListener("offline", function() {
        return Tangerine.online = false;
      });

      /*
       * Responding to this event turns on the menu button
      document.addEventListener "menubutton", (event) ->
        console.log "menu button"
      , false
       */
      return document.addEventListener("backbutton", Tangerine.onBackButton, false);
    }, false);
    if (navigator.userAgent.match(/(iPhone|iPod|iPad|Android|BlackBerry|IEMobile)/)) {
      console.log("loading cordova methods");
      try {
        cordova.file.writeTextToFile = function(params, callback) {
          return window.resolveLocalFileSystemURL(params.path, function(dir) {
            return dir.getFile(params.fileName, {
              create: true
            }, function(file) {
              if (!file) {
                return callback.error('dir.getFile failed');
              }
              return file.createWriter(function(fileWriter) {
                var blob;
                if (params.append === true) {
                  fileWriter.seek(fileWriter.length);
                }
                blob = new Blob([params.text], {
                  type: 'text/plain'
                });
                fileWriter.write(blob);
                return callback.success(file);
              }, function(error) {
                return callback.error(error);
              });
            });
          });
        };
        Utils.saveRecordsToFile = function(text) {
          var fileName, timestamp, username;
          username = Tangerine.user.name();
          timestamp = (new Date).toISOString();
          timestamp = timestamp.replace(/:/g, "-");
          if (username === null) {
            fileName = "backup-" + timestamp + ".json";
          } else {
            fileName = username + "-backup-" + timestamp + ".json";
          }
          console.log("fileName: " + fileName);
          return cordova.file.writeTextToFile({
            text: text,
            path: cordova.file.externalDataDirectory,
            fileName: fileName,
            append: false
          }, {
            success: function(file) {
              alert("Success! Look for the file at " + file.nativeURL);
              return console.log("File saved at " + file.nativeURL);
            },
            error: function(error) {
              return console.log(error);
            }
          });
        };
      } catch (error1) {
        error = error1;
        console.log("Unable to fetch script. Error: " + error);
      }
    }
    return callback();
  },
  loadSingletons: function(callback) {
    window.vm = new ViewManager();
    Tangerine.router = new Router();
    Tangerine.user = new TabletUser();
    Tangerine.nav = new NavigationView({
      user: Tangerine.user,
      router: Tangerine.router
    });
    Tangerine.log = new Log();
    Tangerine.session = new Session();
    Tangerine.app = new Marionette.Application();
    Tangerine.app.rm = new Marionette.RegionManager();
    Tangerine.app.rm.addRegions({
      siteNav: "#siteNav"
    });
    Tangerine.app.rm.addRegions({
      mainRegion: "#content"
    });
    Tangerine.app.rm.addRegions({
      dashboardRegion: "#dashboard"
    });
    return callback();
  },
  reloadUserSession: function(callback) {
    return Tangerine.user.sessionRefresh({
      error: function() {
        return Tangerine.user.logout();
      },
      success: callback
    });
  },
  startBackbone: function(callback) {
    Backbone.history.start();
    return callback();
  },
  monitorBrowserBack: function(callback) {
    return window.addEventListener('popstate', function(e) {
      var sendTo;
      sendTo = Backbone.history.getFragment();
      return Tangerine.router.navigate(sendTo, {
        trigger: true,
        replace: true
      });
    });
  }
};

Tangerine.boot = function() {
  var sequence;
  sequence = [Tangerine.bootSequence.handleCordovaEvents, Tangerine.bootSequence.basicConfig, Tangerine.bootSequence.checkDatabase, Tangerine.bootSequence.versionTag, Tangerine.bootSequence.fetchSettings, Tangerine.bootSequence.guaranteeInstanceId, Tangerine.bootSequence.documentReady, Tangerine.bootSequence.loadI18n, Tangerine.bootSequence.loadSingletons, Tangerine.bootSequence.reloadUserSession, Tangerine.bootSequence.startBackbone];
  return Utils.execute(sequence);
};

Tangerine.boot();

//# sourceMappingURL=data:application/json;base64,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ZCxFQUtULFNBQVMsQ0FBQyxZQUFZLENBQUMsYUFMZCxFQU1ULFNBQVMsQ0FBQyxZQUFZLENBQUMsbUJBTmQsRUFPVCxTQUFTLENBQUMsWUFBWSxDQUFDLGFBUGQsRUFRVCxTQUFTLENBQUMsWUFBWSxDQUFDLFFBUmQsRUFTVCxTQUFTLENBQUMsWUFBWSxDQUFDLGNBVGQsRUFVVCxTQUFTLENBQUMsWUFBWSxDQUFDLGlCQVZkLEVBV1QsU0FBUyxDQUFDLFlBQVksQ0FBQyxhQVhkO1NBZVgsS0FBSyxDQUFDLE9BQU4sQ0FBYyxRQUFkO0FBakJlOztBQW1CakIsU0FBUyxDQUFDLElBQVYsQ0FBQSIsImZpbGUiOiJib290LmpzIiwic291cmNlUm9vdCI6Ii9zb3VyY2UvIiwic291cmNlc0NvbnRlbnQiOlsiXG4jIFRoaXMgZmlsZSBsb2FkcyB0aGUgbW9zdCBiYXNpYyBzZXR0aW5ncyByZWxhdGVkIHRvIFRhbmdlcmluZSBhbmQga2lja3Mgb2ZmIEJhY2tib25lJ3Mgcm91dGVyLlxuIyAgICogVGhlIGRvYyBgY29uZmlndXJhdGlvbmAgaG9sZHMgdGhlIG1ham9yaXR5IG9mIHNldHRpbmdzLlxuIyAgICogVGhlIFNldHRpbmdzIG9iamVjdCBjb250YWlucyBtYW55IGNvbnZlbmllbmNlIGZ1bmN0aW9ucyB0aGF0IHVzZSBjb25maWd1cmF0aW9uJ3MgZGF0YS5cbiMgICAqIFRlbXBsYXRlcyBzaG91bGQgY29udGFpbiBvYmplY3RzIGFuZCBjb2xsZWN0aW9ucyBvZiBvYmplY3RzIHJlYWR5IHRvIGJlIHVzZWQgYnkgYSBGYWN0b3J5LlxuIyBBbHNvIGludGlhbGl6ZWQgaGVyZSBhcmU6IEJhY2tib25lLmpzLCBhbmQgalF1ZXJ5LmkxOG5cbiMgQW55dGhpbmcgdGhhdCBmYWlscyBiYWQgaGVyZSBzaG91bGQgcHJvYmFibHkgYmUgZmFpbGluZyBpbiBmcm9udCBvZiB0aGUgdXNlci5cblxuIyBVdGlscy5kaXNhYmxlQ29uc29sZUxvZygpXG4jIFV0aWxzLmRpc2FibGVDb25zb2xlQXNzZXJ0KClcblxuVGFuZ2VyaW5lLmJvb3RTZXF1ZW5jZSA9XG5cbiAgIyBCYXNpYyBjb25maWd1cmF0aW9uXG5cbiAgYmFzaWNDb25maWcgOiAoY2FsbGJhY2spIC0+XG5cbiAgICAjIyNcbiAgICBQb3VjaCBjb25maWd1cmF0aW9uXG4gICAgIyMjXG5cbiAgICBUYW5nZXJpbmUuZGIgPSBuZXcgUG91Y2hEQihUYW5nZXJpbmUuY29uZi5kYl9uYW1lKVxuICAgIEJhY2tib25lLnN5bmMgPSBCYWNrYm9uZVBvdWNoLnN5bmNcbiAgICAgIGRiOiBUYW5nZXJpbmUuZGJcbiAgICAgIGZldGNoOiAndmlldydcbiAgICAgIHZpZXc6ICd0YW5nZXJpbmUvYnlDb2xsZWN0aW9uJ1xuICAgICAgdmlld09wdGlvbnM6XG4gICAgICAgIGluY2x1ZGVfZG9jcyA6IHRydWVcblxuICAgIEJhY2tib25lLk1vZGVsLnByb3RvdHlwZS5pZEF0dHJpYnV0ZSA9ICdfaWQnXG5cbiAgICAjIHNldCB1bmRlcnNjb3JlJ3MgdGVtcGxhdGUgZW5naW5lIHRvIGFjY2VwdCBoYW5kbGViYXItc3R5bGUgdmFyaWFibGVzXG4gICAgXy50ZW1wbGF0ZVNldHRpbmdzID0gaW50ZXJwb2xhdGUgOiAvXFx7XFx7KC4rPylcXH1cXH0vZ1xuXG4gICAgY2FsbGJhY2soKVxuXG4gICAgIyMjXG4gICAgVGFuZ2VyaW5lLmRiLmRlc3Ryb3kgKGVycm9yKSAtPlxuICAgICAgcmV0dXJuIGFsZXJ0IGVycm9yIGlmIGVycm9yP1xuXG4gICAgICBUYW5nZXJpbmUuZGIgPSBuZXcgUG91Y2hEQihcInRhbmdlcmluZVwiKVxuICAgICAgQmFja2JvbmUuc3luYyA9IEJhY2tib25lUG91Y2guc3luY1xuICAgICAgICBkYjogVGFuZ2VyaW5lLmRiXG5cblxuICAgICAgY2FsbGJhY2soKVxuICAgICMjI1xuXG4gICMgQ2hlY2sgZm9yIG5ldyBkYXRhYmFzZSwgaW5pdGlhbGl6ZSB3aXRoIHBhY2tzIGlmIG5vbmUgZXhpc3RzXG4gIGNoZWNrRGF0YWJhc2U6IChjYWxsYmFjaykgLT5cblxuICAgICMgTG9jYWwgdGFuZ2VyaW5lIGRhdGFiYXNlIGhhbmRsZVxuICAgIGRiID0gVGFuZ2VyaW5lLmRiXG5cbiAgICBkYi5nZXQgXCJpbml0aWFsaXplZFwiLCAoZXJyb3IsIGRvYykgLT5cblxuICAgICAgcmV0dXJuIGNhbGxiYWNrKCkgdW5sZXNzIGVycm9yXG5cbiAgICAgIGNvbnNvbGUubG9nIFwiaW5pdGlhbGl6aW5nIGRhdGFiYXNlXCJcblxuICAgICAgIyBTYXZlIHZpZXdzXG4gICAgICBkYi5wdXQoXG4gICAgICAgIF9pZDogXCJfZGVzaWduLyN7VGFuZ2VyaW5lLmNvbmYuZGVzaWduX2RvY31cIlxuICAgICAgICB2aWV3czpcbiAgICAgICAgICAjIyNcbiAgICAgICAgICAgIFVzZWQgZm9yIHJlcGxpY2F0aW9uLlxuICAgICAgICAgICAgV2lsbCBnaXZlIG9uZSBrZXkgZm9yIGFsbCBkb2N1bWVudHMgYXNzb2NpYXRlZCB3aXRoIGFuIGFzc2Vzc21lbnQgb3IgY3VycmljdWx1bS5cbiAgICAgICAgICAjIyNcbiAgICAgICAgICBieURLZXk6XG4gICAgICAgICAgICBtYXA6ICgoZG9jKSAtPlxuICAgICAgICAgICAgICByZXR1cm4gaWYgZG9jLmNvbGxlY3Rpb24gaXMgXCJyZXN1bHRcIlxuXG4gICAgICAgICAgICAgIGlmIGRvYy5jdXJyaWN1bHVtSWRcbiAgICAgICAgICAgICAgICBpZCA9IGRvYy5jdXJyaWN1bHVtSWRcbiAgICAgICAgICAgICAgICAjIERvIG5vdCByZXBsaWNhdGUga2xhc3Nlc1xuICAgICAgICAgICAgICAgIHJldHVybiBpZiBkb2MuY29sbGVjdGlvbiBpcyBcImtsYXNzXCJcbiAgICAgICAgICAgICAgZWxzZVxuICAgICAgICAgICAgICAgIGlkID0gZG9jLmFzc2Vzc21lbnRJZFxuXG4gICAgICAgICAgICAgIGVtaXQgaWQuc3Vic3RyKC01LDUpLCBudWxsXG4gICAgICAgICAgICApLnRvU3RyaW5nKClcblxuICAgICAgICAgIGJ5Q29sbGVjdGlvbjpcbiAgICAgICAgICAgIG1hcCA6ICggKGRvYykgLT5cblxuICAgICAgICAgICAgICByZXR1cm4gdW5sZXNzIGRvYy5jb2xsZWN0aW9uXG5cbiAgICAgICAgICAgICAgZW1pdCBkb2MuY29sbGVjdGlvbiwgbnVsbFxuXG4gICAgICAgICAgICAgICMgQmVsb25ncyB0byByZWxhdGlvbnNoaXBcbiAgICAgICAgICAgICAgaWYgZG9jLmNvbGxlY3Rpb24gaXMgJ3N1YnRlc3QnXG4gICAgICAgICAgICAgICAgZW1pdCBcInN1YnRlc3QtI3tkb2MuYXNzZXNzbWVudElkfVwiXG5cbiAgICAgICAgICAgICAgIyBCZWxvbmdzIHRvIHJlbGF0aW9uc2hpcFxuICAgICAgICAgICAgICBlbHNlIGlmIGRvYy5jb2xsZWN0aW9uIGlzICdxdWVzdGlvbidcbiAgICAgICAgICAgICAgICBlbWl0IFwicXVlc3Rpb24tI3tkb2Muc3VidGVzdElkfVwiXG5cbiAgICAgICAgICAgICAgZWxzZSBpZiBkb2MuY29sbGVjdGlvbiBpcyAncmVzdWx0J1xuICAgICAgICAgICAgICAgIHJlc3VsdCA9IF9pZCA6IGRvYy5faWRcbiAgICAgICAgICAgICAgICBkb2Muc3VidGVzdERhdGEuZm9yRWFjaCAoc3VidGVzdCkgLT5cbiAgICAgICAgICAgICAgICAgIGlmIHN1YnRlc3QucHJvdG90eXBlIGlzIFwiaWRcIiB0aGVuIHJlc3VsdC5wYXJ0aWNpcGFudElkID0gc3VidGVzdC5kYXRhLnBhcnRpY2lwYW50X2lkXG4gICAgICAgICAgICAgICAgICBpZiBzdWJ0ZXN0LnByb3RvdHlwZSBpcyBcImNvbXBsZXRlXCIgdGhlbiByZXN1bHQuZW5kVGltZSA9IHN1YnRlc3QuZGF0YS5lbmRfdGltZVxuICAgICAgICAgICAgICAgIHJlc3VsdC5zdGFydFRpbWUgPSBkb2Muc3RhcnRfdGltZVxuICAgICAgICAgICAgICAgIGVtaXQgXCJyZXN1bHQtI3tkb2MuYXNzZXNzbWVudElkfVwiLCByZXN1bHRcblxuICAgICAgICAgICAgKS50b1N0cmluZygpXG5cbiAgICAgICkudGhlbiAtPlxuXG4gICAgICAgICNcbiAgICAgICAgIyBMb2FkIFBhY2tzIHRoYXQgVHJlZSBjcmVhdGVzIGZvciBhbiBBUEssIHRoZW4gbG9hZCB0aGUgUGFja3Mgd2UgdXNlIGZvclxuICAgICAgICAjIGRldmVsb3BtZW50IHB1cnBvc2VzLlxuICAgICAgICAjXG5cbiAgICAgICAgcGFja051bWJlciA9IDBcblxuICAgICAgICAjIFJlY3Vyc2l2ZSBmdW5jdGlvbiB0aGF0IHdpbGwgaXRlcmF0ZSB0aHJvdWdoIGpzL2luaXQvcGFjazAwMFswLXhdIHVudGlsXG4gICAgICAgICMgdGhlcmUgaXMgbm8gbG9uZ2VyIGEgcmV0dXJuZWQgcGFjay5cbiAgICAgICAgZG9PbmUgPSAtPlxuXG4gICAgICAgICAgcGFkZGVkUGFja051bWJlciA9IChcIjAwMDBcIiArIHBhY2tOdW1iZXIpLnNsaWNlKC00KVxuXG4gICAgICAgICAgJC5hamF4XG4gICAgICAgICAgICBkYXRhVHlwZTogXCJqc29uXCJcbiAgICAgICAgICAgIHVybDogXCJqcy9pbml0L3BhY2sje3BhZGRlZFBhY2tOdW1iZXJ9Lmpzb25cIlxuICAgICAgICAgICAgZXJyb3I6IChyZXMpIC0+XG4gICAgICAgICAgICAgICMgTm8gbW9yZSBwYWNrPyBXZSdyZSBhbGwgZG9uZSBoZXJlLlxuICAgICAgICAgICAgICBpZiByZXMuc3RhdHVzIGlzIDQwNFxuICAgICAgICAgICAgICAgICMgTWFyayB0aGlzIGRhdGFiYXNlIGFzIGluaXRpYWxpemVkIHNvIHRoYXQgdGhpcyBwcm9jZXNzIGRvZXMgbm90XG4gICAgICAgICAgICAgICAgIyBydW4gYWdhaW4gb24gcGFnZSByZWZyZXNoLCB0aGVuIGxvYWQgRGV2ZWxvcG1lbnQgUGFja3MuXG4gICAgICAgICAgICAgICAgZGIucHV0KHtcIl9pZFwiOlwiaW5pdGlhbGl6ZWRcIn0pLnRoZW4oIC0+IGNhbGxiYWNrKCkgKVxuICAgICAgICAgICAgc3VjY2VzczogKHJlcykgLT5cbiAgICAgICAgICAgICAgcGFja051bWJlcisrXG5cbiAgICAgICAgICAgICAgZGIuYnVsa0RvY3MgcmVzLmRvY3MsIChlcnJvciwgZG9jKSAtPlxuICAgICAgICAgICAgICAgIGlmIGVycm9yXG4gICAgICAgICAgICAgICAgICByZXR1cm4gYWxlcnQgXCJjb3VsZCBub3Qgc2F2ZSBpbml0aWFsaXphdGlvbiBkb2N1bWVudDogI3tlcnJvcn1cIlxuICAgICAgICAgICAgICAgIGRvT25lKClcblxuICAgICAgICAjIGtpY2sgb2ZmIHJlY3Vyc2l2ZSBwcm9jZXNzXG4gICAgICAgIGRvT25lKClcblxuICAjIFB1dCB0aGlzIHZlcnNpb24ncyBpbmZvcm1hdGlvbiBpbiB0aGUgZm9vdGVyXG4gIHZlcnNpb25UYWc6ICggY2FsbGJhY2sgKSAtPlxuICAgICQoXCIjZm9vdGVyXCIpLmFwcGVuZChcIjxkaXYgaWQ9J3ZlcnNpb24nPiN7VGFuZ2VyaW5lLnZlcnNpb259LSN7VGFuZ2VyaW5lLmJ1aWxkVmVyc2lvbn08L2Rpdj5cIilcbiAgICBjYWxsYmFjaygpXG5cbiAgIyBnZXQgb3VyIGxvY2FsIFRhbmdlcmluZSBzZXR0aW5nc1xuICAjIHRoZXNlIGRvIHRlbmQgdG8gY2hhbmdlIGRlcGVuZGluZyBvbiB0aGUgcGFydGljdWxhciBpbnN0YWxsIG9mIHRoZVxuICBmZXRjaFNldHRpbmdzIDogKCBjYWxsYmFjayApIC0+XG4gICAgVGFuZ2VyaW5lLnNldHRpbmdzID0gbmV3IFNldHRpbmdzIFwiX2lkXCIgOiBcInNldHRpbmdzXCJcbiAgICBUYW5nZXJpbmUuc2V0dGluZ3MuZmV0Y2hcbiAgICAgIHN1Y2Nlc3M6IGNhbGxiYWNrXG4gICAgICBlcnJvcjogLT5cbiAgICAgICAgVGFuZ2VyaW5lLnNldHRpbmdzLnNhdmUgVGFuZ2VyaW5lLmRlZmF1bHRzLnNldHRpbmdzLFxuICAgICAgICAgIGVycm9yOiAtPlxuICAgICAgICAgICAgY29uc29sZS5lcnJvciBhcmd1bWVudHNcbiAgICAgICAgICAgIGFsZXJ0IFwiQ291bGQgbm90IHNhdmUgZGVmYXVsdCBzZXR0aW5nc1wiXG4gICAgICAgICAgc3VjY2VzczogY2FsbGJhY2tcblxuICAjIGZvciB1cGdyYWRlc1xuICBndWFyYW50ZWVJbnN0YW5jZUlkOiAoIGNhbGxiYWNrICkgLT5cbiAgICB1bmxlc3MgVGFuZ2VyaW5lLnNldHRpbmdzLmhhcyhcImluc3RhbmNlSWRcIilcbiAgICAgIFRhbmdlcmluZS5zZXR0aW5ncy5zYXZlXG4gICAgICAgIFwiaW5zdGFuY2VJZFwiIDogVXRpbHMuaHVtYW5HVUlEKClcbiAgICAgICxcbiAgICAgICAgZXJyb3I6IC0+IGFsZXJ0IFwiQ291bGQgbm90IHNhdmUgbmV3IEluc3RhbmNlIElkXCJcbiAgICAgICAgc3VjY2VzczogY2FsbGJhY2tcbiAgICBlbHNlXG4gICAgICBjYWxsYmFjaygpXG5cbiAgZG9jdW1lbnRSZWFkeTogKCBjYWxsYmFjayApIC0+ICQgLT5cblxuICAgICMkKFwiPGJ1dHRvbiBpZD0ncmVsb2FkJz5yZWxvYWQgbWU8L2J1dHRvbj5cIikuYXBwZW5kVG8oXCIjZm9vdGVyXCIpLmNsaWNrIC0+IGRvY3VtZW50LmxvY2F0aW9uLnJlbG9hZCgpXG5cbiAgICBjYWxsYmFjaygpXG5cbiAgbG9hZEkxOG46ICggY2FsbGJhY2sgKSAtPlxuICAgIGkxOG4uaW5pdFxuICAgICAgZmFsbGJhY2tMbmcgOiBcImVuLVVTXCJcbiAgICAgIGxuZyAgICAgICAgIDogVGFuZ2VyaW5lLnNldHRpbmdzLmdldChcImxhbmd1YWdlXCIpXG4gICAgICByZXNTdG9yZSAgICA6IFRhbmdlcmluZS5sb2NhbGVzXG4gICAgLCAoZXJyLCB0KSAtPlxuICAgICAgd2luZG93LnQgPSB0XG4gICAgICBjYWxsYmFjaygpXG5cbiAgaGFuZGxlQ29yZG92YUV2ZW50czogKCBjYWxsYmFjayApIC0+XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyIFwiZGV2aWNlcmVhZHlcIlxuICAgICAgLFxuICAgICAgICAtPlxuICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGV2aWNlcmVhZCBldmVudCBmaXJlZC5cIilcbiAgICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyIFwib25saW5lXCIsICAtPiBUYW5nZXJpbmUub25saW5lID0gdHJ1ZVxuICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIgXCJvZmZsaW5lXCIsIC0+IFRhbmdlcmluZS5vbmxpbmUgPSBmYWxzZVxuXG4gICAgICAgICAgIyMjXG4gICAgICAgICAgIyBSZXNwb25kaW5nIHRvIHRoaXMgZXZlbnQgdHVybnMgb24gdGhlIG1lbnUgYnV0dG9uXG4gICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lciBcIm1lbnVidXR0b25cIiwgKGV2ZW50KSAtPlxuICAgICAgICAgICAgY29uc29sZS5sb2cgXCJtZW51IGJ1dHRvblwiXG4gICAgICAgICAgLCBmYWxzZVxuICAgICAgICAgICMjI1xuXG4gICAgICAgICAgIyBwcmV2ZW50cyBkZWZhdWx0XG4gICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lciBcImJhY2tidXR0b25cIiwgVGFuZ2VyaW5lLm9uQmFja0J1dHRvbiwgZmFsc2VcblxuICAgICAgLCBmYWxzZVxuXG4jIGFkZCB0aGUgZXZlbnQgbGlzdGVuZXJzLCBidXQgZG9uJ3QgZGVwZW5kIG9uIHRoZW0gY2FsbGluZyBiYWNrXG5cbiAgICAjIExvYWQgY29yZG92YS5qcyBpZiB3ZSBhcmUgaW4gYSBjb3Jkb3ZhIGNvbnRleHRcbiAgICBpZihuYXZpZ2F0b3IudXNlckFnZW50Lm1hdGNoKC8oaVBob25lfGlQb2R8aVBhZHxBbmRyb2lkfEJsYWNrQmVycnl8SUVNb2JpbGUpLykpXG4gICAgICBjb25zb2xlLmxvZyhcImxvYWRpbmcgY29yZG92YSBtZXRob2RzXCIpXG4jICAgICAgeGhyT2JqID0gIG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgICB0cnlcbiMgICAgICAgIHhock9iai5vcGVuKCdHRVQnLCAnY29yZG92YS5qcycsIGZhbHNlKVxuIyAgICAgICAgeGhyT2JqLnNlbmQoJycpXG4jICAgICAgICBzZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpXG4jICAgICAgICBzZS50ZXh0ID0geGhyT2JqLnJlc3BvbnNlVGV4dFxuIyAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudHNCeVRhZ05hbWUoJ2hlYWQnKVswXS5hcHBlbmRDaGlsZChzZSlcblxuICAgICAgICAjICAvKlxuICAgICAgICAjICogQXR0YWNoIGEgd3JpdGVUZXh0VG9GaWxlIG1ldGhvZCB0byBjb3Jkb3ZhLmZpbGUgQVBJLlxuICAgICAgICAjICpcbiAgICAgICAgIyAqIHBhcmFtcyA9IHtcbiAgICAgICAgIyAqICB0ZXh0OiAnVGV4dCB0byBnbyBpbnRvIHRoZSBmaWxlLicsXG4gICAgICAgICMgKiAgcGF0aDogJ2ZpbGU6Ly9wYXRoL3RvL2RpcmVjdG9yeScsXG4gICAgICAgICMqICBmaWxlTmFtZTogJ25hbWUtb2YtdGhlLWZpbGUudHh0JyxcbiAgICAgICAgIyogIGFwcGVuZDogZmFsc2VcbiAgICAgICAgIyogfVxuICAgICAgICAjKlxuICAgICAgICAjKiBjYWxsYmFjayA9IHtcbiAgICAgICAgIyogICBzdWNjZXNzOiBmdW5jdGlvbihmaWxlKSB7fSxcbiAgICAgICAgIyogICBlcnJvcjogZnVuY3Rpb24oZXJyb3IpIHt9XG4gICAgICAgICMqIH1cbiAgICAgICAgIypcbiAgICAgICAgIyovXG4gICAgICAgIGNvcmRvdmEuZmlsZS53cml0ZVRleHRUb0ZpbGUgPSAocGFyYW1zLCBjYWxsYmFjaykgLT5cbiAgICAgICAgICB3aW5kb3cucmVzb2x2ZUxvY2FsRmlsZVN5c3RlbVVSTChwYXJhbXMucGF0aCwgKGRpcikgLT5cbiAgICAgICAgICAgIGRpci5nZXRGaWxlKHBhcmFtcy5maWxlTmFtZSwge2NyZWF0ZTp0cnVlfSwgKGZpbGUpIC0+XG4gICAgICAgICAgICAgIGlmICghZmlsZSlcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2suZXJyb3IoJ2Rpci5nZXRGaWxlIGZhaWxlZCcpXG4gICAgICAgICAgICAgIGZpbGUuY3JlYXRlV3JpdGVyKFxuICAgICAgICAgICAgICAgIChmaWxlV3JpdGVyKSAtPlxuICAgICAgICAgICAgICAgICAgaWYgcGFyYW1zLmFwcGVuZCA9PSB0cnVlXG4gICAgICAgICAgICAgICAgICAgIGZpbGVXcml0ZXIuc2VlayhmaWxlV3JpdGVyLmxlbmd0aClcbiAgICAgICAgICAgICAgICAgIGJsb2IgPSBuZXcgQmxvYihbcGFyYW1zLnRleHRdLCB7dHlwZTondGV4dC9wbGFpbid9KVxuICAgICAgICAgICAgICAgICAgZmlsZVdyaXRlci53cml0ZShibG9iKVxuICAgICAgICAgICAgICAgICAgY2FsbGJhY2suc3VjY2VzcyhmaWxlKVxuICAgICAgICAgICAgICAsKGVycm9yKSAtPlxuICAgICAgICAgICAgICAgIGNhbGxiYWNrLmVycm9yKGVycm9yKVxuICAgICAgICAgICAgICApXG4gICAgICAgICAgICApXG4gICAgICAgICAgKVxuXG4gICAgICAgICMvKlxuICAgICAgICAjICogVXNlIHRoZSB3cml0ZVRleHRUb0ZpbGUgbWV0aG9kLlxuICAgICAgICAjICovXG4gICAgICAgIFV0aWxzLnNhdmVSZWNvcmRzVG9GaWxlID0gKHRleHQpIC0+XG4gICAgICAgICAgdXNlcm5hbWUgPSBUYW5nZXJpbmUudXNlci5uYW1lKClcbiAgICAgICAgICB0aW1lc3RhbXAgPSAobmV3IERhdGUpLnRvSVNPU3RyaW5nKCk7XG4gICAgICAgICAgdGltZXN0YW1wID0gdGltZXN0YW1wLnJlcGxhY2UoLzovZywgXCItXCIpXG4gICAgICAgICAgaWYgdXNlcm5hbWUgPT0gbnVsbFxuICAgICAgICAgICAgZmlsZU5hbWUgPSBcImJhY2t1cC1cIiArIHRpbWVzdGFtcCArIFwiLmpzb25cIlxuICAgICAgICAgIGVsc2VcbiAgICAgICAgICAgIGZpbGVOYW1lID0gdXNlcm5hbWUgKyBcIi1iYWNrdXAtXCIgKyB0aW1lc3RhbXAgKyBcIi5qc29uXCJcbiAgICAgICAgICBjb25zb2xlLmxvZyhcImZpbGVOYW1lOiBcIiArIGZpbGVOYW1lKVxuICAgICAgICAgIGNvcmRvdmEuZmlsZS53cml0ZVRleHRUb0ZpbGUoe1xuICAgICAgICAgICAgdGV4dDogIHRleHQsXG4gICAgICAgICAgICBwYXRoOiBjb3Jkb3ZhLmZpbGUuZXh0ZXJuYWxEYXRhRGlyZWN0b3J5LFxuICAgICAgICAgICAgZmlsZU5hbWU6IGZpbGVOYW1lLFxuICAgICAgICAgICAgYXBwZW5kOiBmYWxzZVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc3VjY2VzczogKGZpbGUpIC0+XG4gICAgICAgICAgICAgICAgYWxlcnQoXCJTdWNjZXNzISBMb29rIGZvciB0aGUgZmlsZSBhdCBcIiArIGZpbGUubmF0aXZlVVJMKVxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRmlsZSBzYXZlZCBhdCBcIiArIGZpbGUubmF0aXZlVVJMKVxuICAgICAgICAgICAgICAsIGVycm9yOiAoZXJyb3IpIC0+XG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnJvcilcbiAgICAgICAgICAgIH1cbiAgICAgICAgICApXG5cbiAgICAgIGNhdGNoIGVycm9yXG4gICAgICAgIGNvbnNvbGUubG9nKFwiVW5hYmxlIHRvIGZldGNoIHNjcmlwdC4gRXJyb3I6IFwiICsgZXJyb3IpXG4gICAgY2FsbGJhY2soKVxuXG4gIGxvYWRTaW5nbGV0b25zOiAoIGNhbGxiYWNrICkgLT5cbiAgICAjIFNpbmdsZXRvbnNcbiAgICB3aW5kb3cudm0gPSBuZXcgVmlld01hbmFnZXIoKVxuICAgIFRhbmdlcmluZS5yb3V0ZXIgPSBuZXcgUm91dGVyKClcbiAgICBUYW5nZXJpbmUudXNlciAgID0gbmV3IFRhYmxldFVzZXIoKVxuICAgIFRhbmdlcmluZS5uYXYgICAgPSBuZXcgTmF2aWdhdGlvblZpZXdcbiAgICAgIHVzZXIgICA6IFRhbmdlcmluZS51c2VyXG4gICAgICByb3V0ZXIgOiBUYW5nZXJpbmUucm91dGVyXG4gICAgVGFuZ2VyaW5lLmxvZyAgICA9IG5ldyBMb2coKVxuICAgIFRhbmdlcmluZS5zZXNzaW9uID0gbmV3IFNlc3Npb24oKVxuXG4gICAgIyAgaW5pdCAgVGFuZ2VyaW5lIGFzIGEgTWFyaW9uZXR0ZSBhcHBcbiAgICBUYW5nZXJpbmUuYXBwID0gbmV3IE1hcmlvbmV0dGUuQXBwbGljYXRpb24oKVxuICAgIFRhbmdlcmluZS5hcHAucm0gPSBuZXcgTWFyaW9uZXR0ZS5SZWdpb25NYW5hZ2VyKCk7XG5cbiAgICBUYW5nZXJpbmUuYXBwLnJtLmFkZFJlZ2lvbnMgc2l0ZU5hdjogXCIjc2l0ZU5hdlwiXG4gICAgVGFuZ2VyaW5lLmFwcC5ybS5hZGRSZWdpb25zIG1haW5SZWdpb246IFwiI2NvbnRlbnRcIlxuICAgIFRhbmdlcmluZS5hcHAucm0uYWRkUmVnaW9ucyBkYXNoYm9hcmRSZWdpb246IFwiI2Rhc2hib2FyZFwiXG4gICAgY2FsbGJhY2soKVxuXG4gIHJlbG9hZFVzZXJTZXNzaW9uOiAoIGNhbGxiYWNrICkgLT5cblxuICAgIFRhbmdlcmluZS51c2VyLnNlc3Npb25SZWZyZXNoXG4gICAgICBlcnJvcjogLT4gVGFuZ2VyaW5lLnVzZXIubG9nb3V0KClcbiAgICAgIHN1Y2Nlc3M6IGNhbGxiYWNrXG5cbiAgc3RhcnRCYWNrYm9uZTogKCBjYWxsYmFjayApIC0+XG4gICAgQmFja2JvbmUuaGlzdG9yeS5zdGFydCgpXG4gICAgY2FsbGJhY2soKSAjIGZvciB0ZXN0aW5nXG5cbiAgbW9uaXRvckJyb3dzZXJCYWNrOiAoIGNhbGxiYWNrICkgLT5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncG9wc3RhdGUnLCAoZSkgLT5cbiAgICAgIHNlbmRUbyA9IEJhY2tib25lLmhpc3RvcnkuZ2V0RnJhZ21lbnQoKVxuICAgICAgVGFuZ2VyaW5lLnJvdXRlci5uYXZpZ2F0ZShzZW5kVG8sIHsgdHJpZ2dlcjogdHJ1ZSwgcmVwbGFjZTogdHJ1ZSB9KVxuICAgIClcblxuVGFuZ2VyaW5lLmJvb3QgPSAtPlxuXG4gIHNlcXVlbmNlID0gW1xuICAgIFRhbmdlcmluZS5ib290U2VxdWVuY2UuaGFuZGxlQ29yZG92YUV2ZW50c1xuICAgIFRhbmdlcmluZS5ib290U2VxdWVuY2UuYmFzaWNDb25maWdcbiAgICBUYW5nZXJpbmUuYm9vdFNlcXVlbmNlLmNoZWNrRGF0YWJhc2VcbiAgICBUYW5nZXJpbmUuYm9vdFNlcXVlbmNlLnZlcnNpb25UYWdcbiAgICBUYW5nZXJpbmUuYm9vdFNlcXVlbmNlLmZldGNoU2V0dGluZ3NcbiAgICBUYW5nZXJpbmUuYm9vdFNlcXVlbmNlLmd1YXJhbnRlZUluc3RhbmNlSWRcbiAgICBUYW5nZXJpbmUuYm9vdFNlcXVlbmNlLmRvY3VtZW50UmVhZHlcbiAgICBUYW5nZXJpbmUuYm9vdFNlcXVlbmNlLmxvYWRJMThuXG4gICAgVGFuZ2VyaW5lLmJvb3RTZXF1ZW5jZS5sb2FkU2luZ2xldG9uc1xuICAgIFRhbmdlcmluZS5ib290U2VxdWVuY2UucmVsb2FkVXNlclNlc3Npb25cbiAgICBUYW5nZXJpbmUuYm9vdFNlcXVlbmNlLnN0YXJ0QmFja2JvbmVcbiMgICAgVGFuZ2VyaW5lLmJvb3RTZXF1ZW5jZS5tb25pdG9yQnJvd3NlckJhY2tcbiAgXVxuXG4gIFV0aWxzLmV4ZWN1dGUgc2VxdWVuY2VcblxuVGFuZ2VyaW5lLmJvb3QoKVxuIl19
