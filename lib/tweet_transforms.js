var Transforms = {
transformFactory:
  function(transformList) {
    return function(oldText) {
      var content = document.createElement("span");

      do {
        var bestTransform = null;
        var transformIndex = oldText.length;
        var bestLeft = oldText;
        var bestRight = "";

        for(var i = 0; i < transformList.length; ++i) {
          var curIndex = oldText.search(transformList[i].expression);
          if (curIndex > -1 && curIndex < transformIndex) {
            transformIndex = curIndex;
            bestLeft = RegExp.leftContext;
            bestRight = RegExp.rightContext;
            bestTransform = transformList[i].replacement();
          }
        }

        if (bestLeft.length != 0) {
          content.appendChild(document.createTextNode(bestLeft));
        }
        if (bestTransform != null) {
          content.appendChild(bestTransform);
        }

        oldText = bestRight;
      } while (oldText != "");

      return content;
    };
  }
};
