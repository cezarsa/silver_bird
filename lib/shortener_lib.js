function Shortener(backendId) {
  if(!backendId) {
    backendId = 'bitly';
  }
  this.shortenerInfo = SHORTENERS_BACKEND[backendId];
}
Shortener.prototype = {
  shorten: function(longUrl, callback) {
    var _this = this;
    this.shortenerInfo.backend.shorten(longUrl, function(hash) {
      var shortUrl = null;
      if(hash) {
        shortUrl = _this.shortenerInfo.baseUrl + hash;
      }
      callback(shortUrl);
    });
  }
}

BitLyShortener = {
  shorten: function(longUrl, callback) {
    var url = "http://api.bit.ly/shorten";
    var params = {
      login: 'chromedbird',
      apiKey: 'R_aa77c64a8258cf704e7fa361555a4d81',
      version: '2.0.1',
      format: 'json',
      longUrl: longUrl
    }
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'json',
      timeout: 6000,
      success: function(data, status) {
        callback(data.results[longUrl].userHash);
      },
      error: function (request, status, error) {
        callback(null);
      }
    });
  }
}

TrimShortener = {
  shorten: function(longUrl, callback) {
    var url = "http://api.tr.im/v1/trim_url.json";
    var params = {
      url: longUrl
    }
    $.ajax({
      type: 'GET',
      url: url,
      data: params,
      dataType: 'json',
      timeout: 6000,
      success: function(data, status) {
        callback(data.trimpath);
      },
      error: function (request, status, error) {
        callback(null);
      }
    });
  }
}

SHORTENERS_BACKEND = {
  bitly: {
    desc: 'bit.ly',
    baseUrl: 'http://bit.ly/',
    backend: BitLyShortener
  },
  jmp: {
    desc: 'j.mp',
    baseUrl: 'http://j.mp/',
    backend: BitLyShortener
  },
  trim: {
    desc: 'tr.im',
    baseUrl: 'http://tr.im/',
    backend: TrimShortener
  }
}