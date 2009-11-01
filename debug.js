function debug(s, should_inspect) {
  content = s;
  if(should_inspect) {
    content += ":<br/>";
    for(attr in s) {
      content += "&nbsp;&nbsp;" + attr + "<br/>";
    }
  }
  $("#__debug").append(content + "<br/>");
}
$(function() {
  $(document.body).append("<div id='__debug'></div>");
});
