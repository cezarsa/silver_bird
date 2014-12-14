var configurationData = (function(){
  // Configuration data we care about
  var configurationKeys = ["short_url_length", "short_url_length_https"];
  var configurationData = Persistence.configuration();

  var configurationOkay = !!configurationData.val();
  if(configurationOkay) {
    configurationKeys.forEach(function(key) {
      if(configurationData.val()[key] == undefined) configurationOkay = false;
    });
  }

  if(!configurationOkay){
    // Set sensible default values for Twitter configuration
    var configurationDefaults = {
      "short_url_length": 22,
      "short_url_length_https": 23,
      "age": 0
    };
    configurationData.save(configurationDefaults);
  }

  if(configurationData.val().age < (new Date().getTime()) - 1000*60*60*24) {
    // Configuration data too old
    twitterBackend.configuration(function(success, data) {
      if(!success) return; // Better luck next time, old values okay-ish
      var configuration = {};
      configurationKeys.forEach(function(key) {
        configuration[key] = data[key];
      });
      configuration.age = new Date().getTime();
      configurationData.save(configuration);
    });
  }

  return configurationData;
})();
