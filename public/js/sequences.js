// Total size of all segments; we set this later, after loading the data.
let total_size = 0, total_tagged = 0, clicked_cat = null, clicked_depth = null;
let node;
let svg;
const width = 1000;
const height = 1000;
const radius = (Math.min(width, height) / 2);
const x = d3.scaleLinear().range([0, 2 * Math.PI]);
const y = d3.scaleLinear().range([0, radius]);
const partition = d3.partition();
const arc = d3.arc()
  .startAngle(d => Math.max(0, Math.min(2 * Math.PI, x(d.x0))))
  .endAngle(d => Math.max(0, Math.min(2 * Math.PI, x(d.x1))))
  .innerRadius(d => Math.max(0, y(d.y0)))
  .outerRadius(d => Math.max(0, y(d.y1)));
// Breadcrumb dimensions: width, height, spacing, width of tip/tail.
const b = {
  w: 100, h: 30, s: 3, t: 10
};

function createVisualization(json) {
  $("#sunburst").show();
  initializeBreadcrumbTrail();
  d3.select("#chart svg").remove();
  svg = d3.select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .append("g")
      .attr("transform", "translate(" + width / 2 + "," + (height / 2) + ")")
      .attr("id", "donut-container");

  let nodes = d3.hierarchy(json).sum(d => d.size);
  let gSlices = svg.selectAll("g")
    .data(partition(nodes).descendants(), d => (d.data.id) )
    .enter()
      .append("g")
      .attr("id", function(d) {
        return "bite-group-" + d.data.name;
      });

  gSlices.exit().remove();

  gSlices.append("path")
    .attr("fill-rule", "evenodd")
    .attr("id", function(d) {
      if(d.data.name=="root") return "root-path";
      return "bite-"+d.data.name;
    })
    .style("fill", getSBColor)
    .style("opacity", 1)
    .on("click", click)
    .on("mouseover", mouseover);

  gSlices.append("text")
         .attr("dy", ".35em")
         .text(function (d) { return d.parent ? d.data.signal : "" })
         .attr("id", function (d) { return "bite-text-" + d.data.name })
         .attr("fill", "#fff");

  svg.selectAll("path")
     .transition("update")
     .duration(750).attrTween("d", arcTweenPath);

  svg.selectAll("text")
     .transition("update")
     .duration(750)
     .attrTween("transform", arcTweenText)
     .attr("text-anchor", function (d) {
       return d.textAngle > 180 ? "start" : "end"
     })
     .attr("dx", function (d) {
       return d.textAngle > 180 ? 27: 27
     })
     .attr("opacity", function (e) {
      return e.x1 - e.x0 > 0.01 ? 1 : 0
    });

  d3.select("#percentage")
    .text(((total_tagged/total_size) * 100).toFixed(2)+"%");
  // fill the root node with its distribution
  fillRootDistribution(svg, (total_tagged/total_size)*100);
  d3.select("#root-path").style("fill", "url(#grad)");
  d3.select("#chart").on("mouseleave", mouseleave);
}

function fillRootDistribution(svg, percentage) {
  // fill the root node with its distribution
  svg.select("#root-grad").remove();
  let grad = svg.append("defs").attr("id", "root-grad")
    .append("linearGradient")
      .attr("id", "grad")
      .attr("x1", "0%")
      .attr("x2", "0%")
      .attr("y1", "100%").attr("y2", "0%");
  grad.append("stop").attr("offset", percentage+"%").style("stop-color", hexToRGBA("#5687d1", 1));
  grad.append("stop").attr("offset", percentage+"%").style("stop-color", hexToRGBA("#5687d1", 0.5));
  d3.select("#root-path").style("fill", "url(#grad)");
}

function fillDonutSlice(d) {
  if(d.depth < 2) return;
  let $path = $("#bite-"+d.data.name).clone();
  let path = d3.select($path);
  path.on("mouseover", null);
  path.on("mouseleave", null);

  let percentage = 1.0 - (d.value / d.parent.value);
  let new_arc = d3.arc()
    .startAngle(d => Math.max(0, Math.min(2 * Math.PI, x(d.x0))))
    .endAngle(d => Math.max(0, Math.min(2 * Math.PI, x(d.x1))))
    .innerRadius(d => Math.max(0, y(d.y0)))
    .outerRadius(function(d) {
      let offset = (y(d.y1)-y(d.y0)) * percentage;
      return Math.max(0, y(d.y1)-offset);
    });
  $path.attr("d", new_arc(d));

  let $parent = $("#bite-group-"+d.data.name);
  $path.attr("id", "#bite-clone-"+d.data.name);
  $path.addClass("bite-clone");
  $path.css("fill", getSBColor(d));
  $parent.prepend($path);
}

function arcTweenText(a, i) {
  var oi = d3.interpolate({ x0: (a.x0s ? a.x0s : 0), x1: (a.x1s ? a.x1s : 0), y0: (a.y0s ? a.y0s : 0), y1: (a.y1s ? a.y1s : 0) }, a)

  function tween(t) {
    var b = oi(t)
    var ang = ((x((b.x0 + b.x1) / 2) - Math.PI / 2) / Math.PI * 180)

    b.textAngle = (ang > 90) ? 180 + ang : ang
    a.centroid = arc.centroid(b)

    return 'translate(' + arc.centroid(b) + ')rotate(' + b.textAngle + ')'
  }
  return tween
}

function arcTweenPath(a, i) {
  var oi = d3.interpolate({ x0: (a.x0s ? a.x0s : 0), x1: (a.x1s ? a.x1s : 0), y0: (a.y0s ? a.y0s : 0), y1: (a.y1s ? a.y1s : 0) }, a)

  function tween(t) {
    var b = oi(t);
    a.x0s = b.x0
    a.x1s = b.x1
    a.y0s = b.y0
    a.y1s = b.y1
    return arc(b)
  }
  if (i == 0 && node) {

    var xd = d3.interpolate(x.domain(), [node.x0, node.x1])
    var yd = d3.interpolate(y.domain(), [node.y0, 1])
    var yr = d3.interpolate(y.range(), [node.y0 ? 100 : 0, radius])

    return function (t) {
      x.domain(xd(t))
      y.domain(yd(t)).range(yr(t))
      return tween(t)
    }
  } else {
    // first build
    return tween
  }
}

function click(d) {
  if(d.data.name == "root") clicked_cat = null;
  else clicked_cat = d.data.catid;

  node = d
  const total = d.x1 - d.x0
  mouseleave();

  svg.selectAll('path:not(.bite-clone)')
     .transition('click')
     .on("end", updateDonutLabels())
     .duration(200)
     .attrTween('d', arcTweenPath);

  d3.select("#pills-papers").selectAll(".row").remove(); //Remove all objects that might still be there
  //Remove the paper row - append a message about the slow computation time, and run the search for the papers
  d3.select("#paperRow").remove();
  var paperRow = d3.select("#pills-papers").append("div").attr("class", "row justify-content-center").attr("id", "paperRow");
  paperRow.append("div").attr("class", "alert alert-warning alert-dismissible fade show")
      .attr("role", "alert").attr("id", "alert")
      .html("<strong>Please Wait</strong> - the computation might take awhile. <button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button>");
  if(d.data.name == "root") {
    drawPapers()
  } else if(d.data.name.includes("cat")) {
    drawPapers(undefined, d.data.catid);
  } else {
    drawPapers(parseInt(d.data.name))
  }
}

// Fade all but the current sequence, and show it in the breadcrumb trail.
function mouseover(d) {
  if(d.depth == 0) {
    mouseleave();
    return;
  }
  let catid = d.data.catid;
  if(!d.open && d.depth != 1) {
    d.open = true;
    let path = d3.selectAll("path:not(.bite-clone)").filter(function(d) {
      return d.data.catid == catid && d.depth > 1;
    });
    let last_parent;
    let i = 0;
    path.each(function(d) {
      if(last_parent === undefined) last_parent = d.parent.data.name;
      if(d.parent.data.name !== last_parent) {
        last_parent = d.parent.data.name;
        i = 0;
      }
      let n = d.parent.children.length;
      let px0 = d.parent.x0;
      let px1 = d.parent.x1;
      let dx = (px1 - px0)/n;
      d.ix0 = d.x0;
      d.ix1 = d.x1;
      d.x0 = px0 + (dx * (i));
      d.x1 = px0 + (dx * (i+1));
      d.open = true;
      i++;
    });

    path.transition()
      .duration(200)
      .on("end", function(d) {
        d3.select(this.parentNode).select("text")
          .transition(200)
          .attrTween("transform", arcTweenText)
          .attr("opacity", 1);
        fillDonutSlice(d);
      })
      .attrTween("d", arcTweenPath);

  }
  let percentage = (100 * d.value / total_size).toPrecision(3);
  let percentageString = percentage + "%";
  if (percentage < 0.1) {
    percentageString = "< 0.1%";
  }
  d3.select("#percentage")
      .text(percentageString);

  d3.select("#explanation")
      .style("visibility", "");

  let sequenceArray = d.ancestors().reverse();
  sequenceArray.shift(); // remove root node from the array
  updateBreadcrumbs(sequenceArray, percentageString);

  // Fade all the segments.
  d3.selectAll("path")
      .style("opacity", 0.3);

  // Then highlight only those that are an ancestor of the current segment.
  let path = d3.selectAll("path:not(.bite-clone)")
      .filter(function(b) {
          return b.data.catid == d.data.catid;
        });

  path.style("opacity", function(node) {
    if(sequenceArray.indexOf(node) >= 0) return 0.8;
    else return 0.6;
  });

  // fill the root node with its distribution
  let svg = d3.select("#chart svg");
  fillRootDistribution(svg, percentage);
}

// Restore everything to full opacity when moving off the visualization.
function mouseleave(d) {
  $(".bite-clone").remove();
  let path = d3.selectAll("path").filter(function(d) {
    return d.open && d.depth > 1;
  });
  path.each(function(d, i) {
    let dx0 = d.x0;
    let dx1 = d.x1;
    d.x0 = d.ix0;
    d.x1 = d.ix1;
    d.ix0 = dx0;
    d.ix1 = dx1;
    delete d.open;
  });
  path.transition("update")
    .on("end", updateDonutLabels())
    .duration(200)
    .attrTween("d", arcTweenPath);
  d3.selectAll(".bite-clone").remove();
  // Hide the breadcrumb trail
  d3.select("#trail")
      .style("visibility", "hidden");

  // Deactivate all segments during transition.
  d3.selectAll("path").on("mouseover", null);

  // Transition each segment to full opacity and then reactivate it.
  d3.selectAll("path")
      .transition()
      .duration(200)
      .style("opacity", 1)
      .on("end", function() {
          d3.select(this).on("mouseover", mouseover);
        });

  d3.select("#percentage")
      .text(((total_tagged/total_size) * 100).toFixed(2)+"%");

  d3.selectAll("path").style("fill", getSBColor);

  fillRootDistribution(d3.select("#chart svg"), (total_tagged/total_size)*100);
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

function getSBColor(d, alpha_override=null) {
  if(d.data.name == "root") return hexToRGBA("#5687d1");
  if(d.data.name == "untagged") return hexToRGBA("#bbb");
  if(d.data.name.includes("cat")) {
    let catid = parseInt(d.data.name.replace("cat", ""));
    let alpha = alpha_override ? alpha_override : (1.0 - (0.1 * (d.depth-1)));
    // we are a category, return category getSBColor
    return hexToRGBA(sentiment_categories[catid].color, alpha);
  } else {
    let parent = d.parent;
    while(parent.parent != null && parent.parent.data.name != "root") {
      parent = parent.parent;
    }
    let catid = parseInt(parent.data.name.replace("cat", ""));
    let alpha = alpha_override ? alpha_override : (1.0 - (0.2 * (d.depth-1)));
    return hexToRGBA(sentiment_categories[catid].color, alpha);
  }
  return hexToRGBA("#000", 0.5);
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

function cloneSelection(appendTo, toCopy, times) {
    toCopy.each(function() {
        for (var i = 0; i < times; i++) {
            var clone = svg.node().appendChild(this.cloneNode(true));
            d3.select(clone).attr("class", "clone").attr("id", "clone-" + i);
        }
    });
    return appendTo.selectAll('.clone');
}

function updateDonutLabels() {
  d3.select("#chart svg").selectAll("text")
    .transition("update")
    .duration(200)
    .attrTween("transform", arcTweenText)
    .attr("opacity", function (e) {
      if(clicked_cat != null) {
        if(e.data.catid != clicked_cat) return 0;
      }
      return e.x1 - e.x0 > 0.01 ? 1 : 0
  });
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
      var nodeID = parts[j];
      var childNode;
      var nodeName;
      if(nodeID.includes("cat")) {
        nodeName = sentiment_categories[parseInt(nodeID.replace("cat", ""))].name;
      } else {
        nodeName = csv[i][3];
      }
      if (j + 1 < parts.length) {
        // Not yet at the end of the sequence; move down the tree.
        var foundChild = false;
        for (var k = 0; k < children.length; k++) {
          if (children[k]["name"] == nodeID) {
            childNode = children[k];
            foundChild = true;
            break;
          }
        }
        // If we don't already have a child node for this branch, create it.
        if (!foundChild) {
          childNode = {"name": nodeID, "children": []
            , "catid": catid, "signal": nodeName};
          children.push(childNode);
        }
        currentNode = childNode;
      } else {
       	// Reached the end of the sequence; create a leaf node.
       	childNode = {"name": nodeID, "size": size
          , "catid": catid, "signal":nodeName, "children": []};
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
  total_size = loaded_articles.length;
  Object.keys(filtered_data).forEach(key => {
    let signal = filtered_data[key];
    let id = signal.id.toString();
    let curr_signal = signal;
    while(!isNaN(curr_signal.parentid)) {
      id = curr_signal.parentid.toString() + "-" + id;
      curr_signal = filtered_data[curr_signal.parentid];
    }
    id = "cat" + signal.category + "-" + id;
    csv.push([id, signal_scores[signal.id], signal.category, signal.signal]);

    if(!cat_size[signal.category]) {
      cat_size[signal.category] = 0;
    }
    cat_size[signal.category] += signal_scores[signal.id];
    total_tagged += signal_scores[signal.id];
  });
  // csv.push(["untagged", total_size - total_tagged, 0, "", "untagged"]);
  return buildHierarchy(csv);
}
