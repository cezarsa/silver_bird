function UnifiedDMsTweetsTimeline(timelineId, manager, template, timelines) {
  UnifiedTweetsTimeline.call(this, timelineId, manager, template, timelines);
}

$.extend(UnifiedDMsTweetsTimeline.prototype, UnifiedTweetsTimeline.prototype, {
  /* overridden */
  _shouldIncludeTemplate: function(template) {
    return template.id == TimelineTemplate.RECEIVED_DMS || template.id == TimelineTemplate.SENT_DMS;
  }
});
  
  
  
  