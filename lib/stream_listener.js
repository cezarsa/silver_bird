var StreamListener = (function() {

  var props = {
    streamReconnectCount: 0,
    streamReconnectBaseTime: 20000,
    streamReconnectWaitTime: this.streamReconnectBaseTime,
    streamMaxStaleTime: 90000,
    streamMaxReconnectWait: 240000
  };

  props.subscribers = [];
  props.twitterLib = null;

  var curry = function(func) {
    var slice = Array.prototype.slice, args = slice.call(arguments, 1);
    return function() {
      func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  var publish = function(data) {
    if(props.twitterLib) {
      if(data.hasOwnProperty('text')) {
        props.twitterLib.normalizeTweets(data);
      } else if(data.hasOwnProperty('direct_message')) {
        props.twitterLib.normalizeTweets(data.direct_message);
      }
    }
    console.log(data);
    for(var i = 0, len = props.subscribers.length; i < len; ++i) {
      var sub = props.subscribers[i];
      sub.callback.call(sub.context, data);
    }
  };

  var publishDisconnect = curry(publish, {
    event: 'disconnected'
  });

  var xhr, onProgress;

  var stopStream = function() {
    if(!xhr) {
      return;
    }
    xhr.removeEventListener("progress", onProgress, false);
    xhr.abort();
  };

  var connectStream = function() {
    if(!OptionsBackend.get('use_streaming_api')) {
      return;
    }
    var MAX_BUFFER = 1024 * 500;

    var url = OptionsBackend.get('user_stream_url');
    var params = {
      delimited: 'length'
    };

    props.streamReconnectCount += 1;
    console.log('connecting to stream ', props.streamReconnectCount);

    xhr = new XMLHttpRequest();
    xhr.open('GET', url + '?' + $.param(params), true);
    xhr.setRequestHeader('X-User-Agent', 'Chromed Bird ' + JSON.parse(Persistence.version().val()).join('.'));
    if(props.twitterLib) {
      props.twitterLib.signOauth(xhr, url, params, 'GET');
    }

    var lastLoaded = 0, lastChunkLen, lastProgressTime = new Date().getTime();
    onProgress = function(e) {
      console.log('loaded', e.loaded, 'time', new Date().getTime() - lastProgressTime);
      lastProgressTime = new Date().getTime();

      var totalLen = e.loaded;
      if(totalLen > MAX_BUFFER) {
        console.log('stream disconnected, buffer too large');
        stopStream();
      }
      var data = xhr.responseText;

      while(lastLoaded < totalLen) {
        if(!lastChunkLen) {
          lastChunkLen = '';
          var curChar = data.charAt(lastLoaded);
          while(curChar != '\n' || lastChunkLen.length === 0) {
            if(curChar.match(/\d/)) {
              lastChunkLen += curChar;
            }
            lastLoaded += 1;
            if(lastLoaded >= totalLen) {
              return;
            }
            curChar = data.charAt(lastLoaded);
          }
          lastLoaded += 1;
          lastChunkLen = parseInt(lastChunkLen, 10);
        }
        if(lastLoaded + lastChunkLen > totalLen) {
          // Let's just wait for the rest of our data
          return;
        }
        var jsonChunk = data.substring(lastLoaded, lastLoaded + lastChunkLen);
        var parsedChunk = JSON.parse(jsonChunk);
        publish(parsedChunk);
        lastLoaded += lastChunkLen;
        lastChunkLen = null;
      }
    };

    xhr.addEventListener("progress", onProgress, false);
    var intervalHandle;
    xhr.onreadystatechange = function() {
      if(xhr.readyState == 2 && xhr.status == 200) {
        console.log('stream connected ok');

        var checkStaleConnection = function() {
          var time = new Date().getTime();
          if(time - lastProgressTime > props.streamMaxStaleTime) {
            console.log('stream stale connection');
            stopStream();
          }
        };
        intervalHandle = setInterval(checkStaleConnection, props.streamMaxStaleTime / 2);

        props.streamReconnectWaitTime = props.streamReconnectBaseTime;
      } else if(xhr.readyState == 4) {
        console.log('stream disconnected', xhr.status, xhr.statusText);
        publishDisconnect();
        if(intervalHandle) {
          clearInterval(intervalHandle);
          intervalHandle = null;
        }
        if(props.twitterLib) {
          setTimeout(function() {
            connectStream();
          }, props.streamReconnectWaitTime);
          if(props.streamReconnectWaitTime < props.streamMaxReconnectWait) {
            props.streamReconnectWaitTime *= 2;
          }
        }
      }
    };

    xhr.send();
  };

  return {
    events: {
      DISCONNECTED: 'disconnected'
    },

    start: function(twitterLib) {
      props.twitterLib = twitterLib;
      connectStream();
    },

    disconnect: function() {
      props.twitterLib = null;
      props.subscribers = [];
      stopStream();
    },

    unsubscribe: function(context) {
      console.log('unsubscribe: ' + context.template.id);
      var newSubscribers = [];
      for(var i = 0, len = props.subscribers.length; i < len; ++i) {
        var sub = props.subscribers[i];
        if(sub.context != context) {
          newSubscribers.push(sub);
        }
      }
      props.subscribers = newSubscribers;
    },

    subscribe: function(callbackOrOptions, context) {
      var options = (typeof callbackOrOptions === 'function') ? {
        callback: callbackOrOptions,
        context: context
      } : callbackOrOptions;
      props.subscribers.push(options);
    }
  };
}).call({});