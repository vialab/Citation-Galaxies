height// Dimensions of sunburst.
var width = 750;
var height = 600;
var radius = Math.min(width, height) / 2;

// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
var b = {
  w: 75, h: 30, s: 3, t: 10
};

// Total size of all segments; we set this later, after loading the data.
var totalSize = 0;

// Use d3.text and d3.csvParseRows so that we do not need to have a header
// row, and can receive the csv as an array of arrays.
// d3.text("visit-sequences.csv", function(text) {
//   var csv = d3.csvParseRows(text);
//   var json = buildHierarchy(csv);
//   createVisualization(json);
// });

// Main function to draw and set up the visualization, once we have the data.
function createVisualization(json, clicked) {
  d3.select("#chart svg").remove();
  var vis = d3.select("#chart").append("svg:svg")
      .attr("width", width)
      .attr("height", height)
      .append("svg:g")
      .attr("id", "container")
      .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

  var partition = d3.partition()
      .size([2 * Math.PI, radius * radius]);

  var arc = d3.arc()
      .startAngle(function(d) { return d.x0; })
      .endAngle(function(d) { return d.x1; })
      .innerRadius(function(d) { return Math.sqrt(d.y0); })
      .outerRadius(function(d) { return Math.sqrt(d.y1); });

  // Basic setup of page elements.
  initializeBreadcrumbTrail();
  drawLegend();
  d3.select("#togglelegend").on("click", toggleLegend);

  // Bounding circle underneath the sunburst, to make it easier to detect
  // when the mouse leaves the parent g.
  vis.append("svg:circle")
      .attr("r", radius)
      .style("opacity", 0);

  // Turn the data into a d3 hierarchy and calculate the sums.
  var root = d3.hierarchy(json)
      .sum(function(d) { return d.size; })
      .sort(function(a, b) { return b.value - a.value; });

  // For efficiency, filter nodes to keep only those large enough to see.
  var nodes = partition(root).descendants()
      .filter(function(d) {
          return (d.x1 - d.x0 > 0.005); // 0.005 radians = 0.29 degrees
      });

  var path = vis.data([json]).selectAll("path")
      .data(nodes)
      .enter().append("svg:path")
      // .attr("display", function(d) { return d.depth ? null : "none"; })
      .attr("d", arc)
      .attr("fill-rule", "evenodd")
      .attr("id", function(d) {
        if(d.data.name=="root") return "root-path";
        return "";
      })
      .style("fill", getSBColor)
      .style("opacity", 1)
      .on("mouseover", mouseover)
      .on("click", clicked);

  // Add the mouseleave handler to the bounding circle.
  d3.select("#container").on("mouseleave", mouseleave);

  // Get total size of the tree = value of root node from partition.
  // totalSize = path.datum().value;
 };

// Fade all but the current sequence, and show it in the breadcrumb trail.
function mouseover(d) {

  var percentage = (100 * d.value / totalSize).toPrecision(3);
  var percentageString = percentage + "%";
  if (percentage < 0.1) {
    percentageString = "< 0.1%";
  }

  d3.select("#percentage")
      .text(percentageString);

  d3.select("#explanation")
      .style("visibility", "");

  var sequenceArray = d.ancestors().reverse();
  sequenceArray.shift(); // remove root node from the array
  updateBreadcrumbs(sequenceArray, percentageString);

  // Fade all the segments.
  d3.selectAll("path")
      .style("opacity", 0.3);

  var vis = d3.select("g#container");
  vis.select("defs").remove();
  let grad = vis.append("defs").append("linearGradient")
    .attr("id", "grad")
    .attr("x1", "0%")
    .attr("x2", "0%")
    .attr("y1", "100%").attr("y2", "0%");
  grad.append("stop").attr("offset", percentage+"%").style("stop-color", hexToRGBA("#5687d1", 1));
  grad.append("stop").attr("offset", percentage+"%").style("stop-color", hexToRGBA("#5687d1", 0.5));
  d3.select("#root-path").style("fill", "url(#grad)");
  // Then highlight only those that are an ancestor of the current segment.
  vis.selectAll("path")
      .filter(function(node) {
                return (sequenceArray.indexOf(node) >= 0);
              })
      .style("opacity", 1);
}

// Restore everything to full opacity when moving off the visualization.
function mouseleave(d) {

  // Hide the breadcrumb trail
  d3.select("#trail")
      .style("visibility", "hidden");

  // Deactivate all segments during transition.
  d3.selectAll("path").on("mouseover", null);

  // Transition each segment to full opacity and then reactivate it.
  d3.selectAll("path")
      .transition()
      .duration(1000)
      .style("opacity", 1)
      .on("end", function() {
              d3.select(this).on("mouseover", mouseover);
            });

  d3.select("#explanation")
      .style("visibility", "hidden");
}

// what happens when something is clicked?
function categoryClick(d) {
  if(d.data.name == "root") return;
  let filtered_data = filterSignals(d.data.catid);
  createVisualization(transformScores(filtered_data), signalClick);
}

function signalClick(d) {
  if(d.data.name.includes("cat")) return;
  if(d.data.name == "root") {
    createVisualization(transformScores(), categoryClick);
    return;
  }
  let filtered_data = filterSignals(undefined, d.data.name);
  createVisualization(transformScores(filtered_data, signalClick));
}

function initializeBreadcrumbTrail() {
  // Add the svg area.
  var trail = d3.select("#sequence").append("svg:svg")
      .attr("width", width)
      .attr("height", 50)
      .attr("id", "trail");
  // Add the label at the end, for the percentage.
  trail.append("svg:text")
    .attr("id", "endlabel")
    .style("fill", "#000");
}

// Generate a string that describes the points of a breadcrumb polygon.
function breadcrumbPoints(d, i) {
  var points = [];
  points.push("0,0");
  points.push(b.w + ",0");
  points.push(b.w + b.t + "," + (b.h / 2));
  points.push(b.w + "," + b.h);
  points.push("0," + b.h);
  if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
    points.push(b.t + "," + (b.h / 2));
  }
  return points.join(" ");
}

function getSBColor(d) {
  if(d.data.name == "root") return hexToRGBA("#5687d1");
  if(d.data.name.includes("cat")) {
    let catid = parseInt(d.data.name.replace("cat", ""));
    let alpha = 1.0 - (0.1 * (d.depth-1));
    // we are a category, return category colors
    return hexToRGBA(sentiment_categories[catid].color, alpha);
  } else {
    let parent = d.parent;
    while(parent.parent != null && parent.parent.data.name != "root") {
      parent = parent.parent;
    }
    let catid = parseInt(parent.data.name.replace("cat", ""));
    let alpha = 1.0 - (0.2 * (d.depth-1));
    return hexToRGBA(sentiment_categories[catid].color, alpha);
  }
  return colors(d.data.name);
}

function hexToRGBA(hex, A=1.0){
    var c;
    if(/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return 'rgba('+[(c>>16)&255, (c>>8)&255, c&255].join(',')+','
          + A.toString() + ')';
    }
    throw new Error('Bad Hex');
}

// Update the breadcrumb trail to show the current sequence and percentage.
function updateBreadcrumbs(nodeArray, percentageString) {

  // Data join; key function combines name and depth (= position in sequence).
  var trail = d3.select("#trail")
      .selectAll("g")
      .data(nodeArray, function(d) { return d.data.name + d.depth; });

  // Remove exiting nodes.
  trail.exit().remove();

  // Add breadcrumb and label for entering nodes.
  var entering = trail.enter().append("svg:g");

  entering.append("svg:polygon")
      .attr("points", breadcrumbPoints)
      .style("fill", getSBColor);

  entering.append("svg:text")
      .attr("x", (b.w + b.t) / 2)
      .attr("y", b.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(function(d) {
        if(d.data.name.includes("cat")) {
          return sentiment_categories[d.data.catid].name;
        } else {
          return d.data.signal;
        }
      });

  // Merge enter and update selections; set position for all nodes.
  entering.merge(trail).attr("transform", function(d, i) {
    return "translate(" + i * (b.w + b.s) + ", 0)";
  });

  // Now move and update the percentage at the end.
  d3.select("#trail").select("#endlabel")
      .attr("x", (nodeArray.length + 0.5) * (b.w + b.s))
      .attr("y", b.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(percentageString);

  // Make the breadcrumb trail visible, if it's hidden.
  d3.select("#trail")
      .style("visibility", "");

}

function drawLegend() {

  // Dimensions of legend item: width, height, spacing, radius of rounded rect.
  var li = {
    w: 75, h: 30, s: 3, r: 3
  };

  var legend = d3.select("#legend").append("svg:svg")
      .attr("width", li.w)
      .attr("height", d3.keys(colors).length * (li.h + li.s));

  var g = legend.selectAll("g")
      .data(d3.entries(colors))
      .enter().append("svg:g")
      .attr("transform", function(d, i) {
              return "translate(0," + i * (li.h + li.s) + ")";
           });

  g.append("svg:rect")
      .attr("rx", li.r)
      .attr("ry", li.r)
      .attr("width", li.w)
      .attr("height", li.h)
      .style("fill", function(d) { return d.value; });

  g.append("svg:text")
      .attr("x", li.w / 2)
      .attr("y", li.h / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", "middle")
      .text(function(d) { return d.key; });
}

function toggleLegend() {
  var legend = d3.select("#legend");
  if (legend.style("visibility") == "hidden") {
    legend.style("visibility", "");
  } else {
    legend.style("visibility", "hidden");
  }
}

// Take a 2-column CSV and transform it into a hierarchical structure suitable
// for a partition layout. The first column is a sequence of step names, from
// root to leaf, separated by hyphens. The second column is a count of how
// often that sequence occurred.
function buildHierarchy(csv) {
  var root = {"name": "root", "children": []
    , "catid": "", "signal":"root"};
  for (var i = 0; i < csv.length; i++) {
    var sequence = csv[i][0];
    var size = +csv[i][1];
    var catid = csv[i][2];
    var signal = csv[i][3];
    if (isNaN(size)) { // e.g. if this is a header row
      continue;
    }
    var parts = sequence.split("-");
    var currentNode = root;
    for (var j = 0; j < parts.length; j++) {
      var children = currentNode["children"];
      var nodeName = parts[j];
      var childNode;
      if (j + 1 < parts.length) {
        // Not yet at the end of the sequence; move down the tree.
        var foundChild = false;
        for (var k = 0; k < children.length; k++) {
          if (children[k]["name"] == nodeName) {
            childNode = children[k];
            foundChild = true;
            break;
          }
        }
        // If we don't already have a child node for this branch, create it.
        if (!foundChild) {
          childNode = {"name": nodeName, "children": []
            , "catid": catid, "signal":signal};
          children.push(childNode);
        }
        currentNode = childNode;
      } else {
       	// Reached the end of the sequence; create a leaf node.
       	childNode = {"name": nodeName, "size": size
          , "catid": catid, "signal":signal};
       	children.push(childNode);
      }
    }
  }
  return root;
};

// format our signals/categories into a 2D array to mimic a csv
// hyphen dillineated path with match count
// [cat-signalid-x, match_count, categoryid, categoryname, signal]
function transformScores(filtered_data=sentiment_signals) {
  let csv = [];
  let cat_size = {};
  totalSize = loaded_articles.length;
  Object.keys(filtered_data).forEach(key => {
    let signal = filtered_data[key];
    let id = signal.id.toString();
    while(!isNaN(signal.parentid)) {
      id = signal.parentid.toString() + "-" + id;
    }
    id = "cat" + signal.category + "-" + id;
    csv.push([id, signal_scores[signal.id], signal.category, signal.signal]);

    if(!cat_size[signal.category]) {
      cat_size[signal.category] = 0;
    }
    cat_size[signal.category] += signal_scores[signal.id];
  });
  return buildHierarchy(csv);
}
