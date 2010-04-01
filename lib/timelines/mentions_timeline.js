function MentionsTweetsTimeline(timelineId, manager, template) {
  TweetsTimeline.call(this, timelineId, manager, template);
}

$.extend(MentionsTweetsTimeline.prototype, TweetsTimeline.prototype, {
  /* overridden */
  init: function() {
    this.template.timelineName = '@' + this.manager.twitterBackend.username();
    this.giveMeTweets(function() {});
  }
});