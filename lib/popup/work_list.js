var WorkList = {
  bindEvents: function() {
    $(".worklist_container .worklist_cancel_trigger").bind('click', WorkList.cancelMessage.bind(WorkList));
  },

  init: function() {
    if(tweetManager.sendQueue.queueSize() !== 0) {
      $("#queue_loading").show();
    }
    tweetManager.sendQueue.onQueueEmpty(function(lastSent) {
      if(!window) {
        return;
      }
      WorkList.sendQueueEmpty(lastSent);
    });
    tweetManager.sendQueue.onTweetEnqueued(function() {
      if(!window) {
        return;
      }
      WorkList.tweetEnqueued();
    });
    tweetManager.sendQueue.onSendFailed(function() {
      if(!window) {
        return;
      }
      WorkList.sendFailed();
    });
    // Just checking
    WorkList.sendFailed();

    $("#queue_loading").tipsy({
      title: function() {
        var html = '<div class="worklist_container"><span class="title">' +
                   chrome.i18n.getMessage("queued_messages") +
                   '</span>';
        html += '<ul class="worklist">';
        var queueItems = tweetManager.sendQueue.queue;
        for(var i = 0, len = queueItems.length; i < len; ++i) {
          var queueItem = queueItems[i];
          var message = queueItem.message;
          if(i === 0 && message.length > 15) {
            message = message.substring(0, 13) + '...';
          } else if(message.length > 50) {
            message = message.substring(0, 48) + '...';
          }
          html += '<li>';
          html += message;
          if(i === 0) {
            var timeDiff = ((new Date()).getTime() - queueItem.createdAt.getTime()) / 1000;
            var timeDiffDesc;
            if(timeDiff < 60) {
              timeDiffDesc = parseInt(timeDiff, 10) + 's';
            } else {
              timeDiffDesc = parseInt(timeDiff / 60, 10) + 'm';
            }
            if(queueItem.retryCount == 1) {
              html += '<span class="title"> ' +
                      chrome.i18n.getMessage("queue_trying", timeDiffDesc) +
                      '</span>';
            } else {
              html += '<span class="title"> ' +
                      chrome.i18n.getMessage("queue_retried", [queueItem.retryCount, timeDiffDesc, queueItem.lastStatus]) +
                      '</span>';
            }
            if(queueItem.shouldCancel) {
              html += ' <span class="title" style="color: #d00;">' +
                      chrome.i18n.getMessage("canceling") +
                      '</span>';
            } else {
              html += '<img src="img/cancel.png" class="worklist_cancel_trigger" title="' +
                      chrome.i18n.getMessage("cancelTweet") + '">';
            }
          }
          html += '</li>';
        }
        html += '</ul></div>';
        return html;
      },
      html: true,
      opacity: 0.9,
      delayOut: 500,
      persistOnHover: true,
      maxWidth: 400,
      gravity: 'tasks'
    });
  },

  cancelMessage: function() {
    var queueItems = tweetManager.sendQueue.queue;
    if(queueItems.length > 0) {
      queueItems[0].cancel();
    }
    $("#queue_loading").tipsy({refresh: true});
  },

  sendQueueEmpty: function(lastSent) {
    $("#queue_loading").hide();
    var updateTimelineId = TimelineTemplate.HOME;
    if(lastSent && lastSent.message.indexOf('d ') === 0) {
      updateTimelineId = TimelineTemplate.SENT_DMS;
    }
    loadTimeline(true, updateTimelineId);
  },

  tweetEnqueued: function() {
    $("#queue_loading").show();
  },

  sendFailed: function() {
    var abortedQueue = tweetManager.sendQueue.abortedStatus();
    if(!abortedQueue || abortedQueue.length === 0) {
      return;
    }
    // If we're here that's because something went wrong
    if(!Composer.isVisible()) {
      // For now let's just show the first enqueued message
      var topMessage = abortedQueue[0];
      Composer.initMessage(topMessage.message, topMessage.replyId, topMessage.replyUser, true);
    }
    Renderer.showError(chrome.i18n.getMessage("tweet_send_error"));
  }
};
