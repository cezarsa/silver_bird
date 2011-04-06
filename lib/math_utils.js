
Math.createLinearFunction = function(m, b) {
  /* f(x) = mx + b */
  return function(x) {
    return m * x + b;
  };
};

Math.linearLeastSquares = function(points, xOffset) {
  /* Using linear least squares method to create an equation in the form f(x) = mx + b */

  var n = points.length;
  if(n === 0) {
    return null;
  }
  if(!xOffset) {
    xOffset = 0;
  }

  /* Calculate sums that'll be needed latter */
  var sum_x = 0, sum_y = 0, sum_xy = 0, sum_x_squared = 0;
  for(var i = 0; i < n; ++i) {
    var point = points[i];
    var x = point[0] - xOffset, y = point[1];
    sum_x += x;
    sum_y += y;
    sum_xy += x * y;
    sum_x_squared += x * x;
  }

  /* Calculating deviation, matrix determinant of
     | sum_x_squared  sum_x |
     | sum_x          n     |
  */
  var d = (n * sum_x_squared) - (sum_x * sum_x);

  /* Calculating m component
     | sum_xy  sum_x |
     | sum_y   n     | / deviation
  */
  var m = ((n * sum_xy) - (sum_x * sum_y)) / d;

  /* Calculating b component
     | sum_x_squared  sum_xy |
     | sum_x          sum_y  | / deviation
  */
  var b = ((sum_x_squared * sum_y) - (sum_xy * sum_x)) / d;

  return Math.createLinearFunction(m, b);
};


Math.generateTendencyGraph = function(canvas, points, xLimit) {
  if(!points || points.length < 3) {
    return;
  }

  var w = canvas.width, h = canvas.height;
  var ctx = canvas.getContext("2d");

  var xMargin = 30,
      yMargin = 35;

  var pointsLen = points.length;
  var xOffset = points[0][0];
  var yOffset = points[0][1];

  var xArea = 15 * 60 * 1000; // 15 minutes area
  var xScale = (w - (2 * xMargin)) / xArea;
  var yScale = (h - (2 * yMargin)) / (points[0][1] - points[pointsLen - 1][1]);

  var adjustPoint = function(pointOrX, yOpt) {
    if(yOpt !== undefined) {
      pointOrX = [pointOrX, yOpt];
    }
    var x = ((pointOrX[0] - xOffset) * xScale) + xMargin;
    var y = ((yOffset - pointOrX[1]) * yScale) + yMargin;
    return [parseInt(x, 10), parseInt(y, 10)];
  };

  ctx.clearRect(0, 0, w, h);
  ctx.font = 'normal 12px Helvetica, sans-serif';

  ctx.setStrokeColor(0, 0, 0, 1);
  ctx.beginPath();
  for(var i = 0; i < pointsLen - 1; ++i) {
    var p1Graph = adjustPoint(points[i]),
        p2Graph = adjustPoint(points[i + 1]);
    if(i === 0) {
      ctx.moveTo(p1Graph[0], p1Graph[1]);
    }
    ctx.lineTo(p2Graph[0], p2Graph[1]);
  }
  ctx.stroke();
  ctx.beginPath();

  /* Grids */

  ctx.setStrokeColor('#aaa');
  ctx.textBaseline = 'bottom';
  for(i = 0; i < pointsLen; ++i) {
    var y = points[i][1];
    var adjY = adjustPoint(0, y)[1];
    ctx.fillText(y, 0, adjY);
    ctx.moveTo(xMargin, adjY);
    ctx.lineTo(w, adjY);
  }

  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  for(var x = points[0][0]; x <= (points[0][0] + xArea); x += 2 * 60 * 1000) {
    var adjX = adjustPoint(x, 0)[0];
    ctx.moveTo(adjX, 0);
    ctx.lineTo(adjX, h - yMargin);

    var dateObj = new Date();
    dateObj.setTime(x);
    var minutes = dateObj.getMinutes();
    if(('' + minutes).length == 1) {
      minutes = '0' + minutes;
    }
    ctx.fillText(dateObj.getHours() + ':' + minutes, adjX, h - yMargin);
  }

  ctx.stroke();
  ctx.beginPath();

  /* Tendency line */

  var tendencyFunc = Math.linearLeastSquares(points, xOffset);
  var b = tendencyFunc(0);
  var m = tendencyFunc(1) - b;

  var p1 = adjustPoint(xOffset, tendencyFunc(0)),
      p2 = adjustPoint(((points[pointsLen - 1][1] - b) / m) + xOffset, points[pointsLen - 1][1]);

  ctx.stroke();
  ctx.beginPath();
  ctx.setStrokeColor(255, 0, 0, 1);
  ctx.moveTo(p1[0], p1[1]);
  ctx.lineTo(p2[0], p2[1]);
  ctx.stroke();

  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText('f(x) = ' + m.toPrecision(2) + 'x + ' + b.toPrecision(2), xMargin + 20, yMargin);

  var projectedHitsLeft = tendencyFunc(xLimit - xOffset);
  ctx.textBaseline = 'bottom';
  ctx.fillText('Projected hits left at reset time: ' + projectedHitsLeft, 0, h);
};