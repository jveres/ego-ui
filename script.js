var DEFAULT_TEXT = "apple";
var NETWORK_DOMAIN = "ego-network.jveres.repl.co";

var graph = undefined;
var colors = ["#f0b5ff", "#93f2ab", "#f9e690", "#ffc9fc", "#c1f3ff"];

var nodes = new vis.DataSet([]);
var edges = new vis.DataSet([]);

var allNodes = undefined;
var highlightActive = false;

var container = document.getElementById('graph');
var data = {
  nodes: nodes,
  edges: edges
};
var options = {
  physics:{
    enabled: true,
    barnesHut: {
      gravitationalConstant: -2000
    }
  },
  nodes: {
    scaling: {
      min:8,
      max:14,
      label: {
        min:10,
        max:24
      }
    },
    font: {
      strokeColor: '#ffffff',
      strokeWidth: 4
    }
  },
  edges: {
    smooth: false,
    color: {
      inherit: 'both'
    },
    scaling: {
      min: 1,
      max: 10
    }
  },
  interaction: {
    selectable: true
  }
};

var randomSeed = +getUrlParameter('s');
if (randomSeed) {
  options.layout = {
    randomSeed: Number(randomSeed)
  };
}
var network = new vis.Network(container, data, options);
network.on("click", neighbourhoodHighlight);

async function search(query) {
  clearGraph();
  query = query.trim().toLocaleLowerCase();
  try {
    graph = await fetch(window.location.protocol+'//' + NETWORK_DOMAIN + '/s/' + encodeURIComponent(query)).then(response => response.json())
    drawGraph(query);
  } catch (e) {
    console.log(e);
    return e;
  }
}

function drawGraph(query) {
  // nodes
  for (const node of graph.nodes) {
    var shape = node.depth === 0 ? 'diamond' : 'dot';
    var color = node.depth === 0 ? '#fb7e81' : colors[node.depth];
    nodes.add({id: node.id, label: node.id, shape: shape, value: node.count, color: color});
  }
  allNodes = nodes.get({ returnType: "Object" });
  network.focus(query);
  // edges
  for (const link of graph.links) edges.add({from: link.source, to: link.target, value: link.weight, title: link.query});
}

function clearGraph() {
  highlightActive = false;
  nodes.clear();
  edges.clear();
  network.stabilize();
  graph = undefined;
}

function neighbourhoodHighlight(params) {
  if (params.nodes.length > 0) {
    highlightActive = true;
    var i, j;
    var selectedNode = params.nodes[0];
    var degrees = 1;
    for (var nodeId in allNodes) {
      if (allNodes[nodeId].hiddenColor === undefined) {
        allNodes[nodeId].hiddenColor = allNodes[nodeId].color;
        allNodes[nodeId].color = "rgba(200, 200, 200, 0.5)";
      }
      if (allNodes[nodeId].hiddenLabel === undefined) {
        allNodes[nodeId].hiddenLabel = allNodes[nodeId].label;
        allNodes[nodeId].label = undefined;
      }
    }
    var connectedNodes = network.getConnectedNodes(selectedNode);
    var allConnectedNodes = [];
    for (i = 1; i < degrees; i++) {
      for (j = 0; j < connectedNodes.length; j++) {
        allConnectedNodes = allConnectedNodes.concat(
          network.getConnectedNodes(connectedNodes[j])
        );
      }
    }
    for (i = 0; i < connectedNodes.length; i++) {
      if (allNodes[connectedNodes[i]].hiddenColor !== undefined) {
        allNodes[connectedNodes[i]].color =
          allNodes[connectedNodes[i]].hiddenColor;
        allNodes[connectedNodes[i]].hiddenColor = undefined;
      }
      if (allNodes[connectedNodes[i]].hiddenLabel !== undefined) {
        allNodes[connectedNodes[i]].label =
          allNodes[connectedNodes[i]].hiddenLabel;
        allNodes[connectedNodes[i]].hiddenLabel = undefined;
      }
    }
    if (allNodes[selectedNode].hiddenColor !== undefined) {
      allNodes[selectedNode].color = allNodes[selectedNode].hiddenColor;
      allNodes[selectedNode].hiddenColor = undefined;
    }
    if (allNodes[selectedNode].hiddenLabel !== undefined) {
      allNodes[selectedNode].label = allNodes[selectedNode].hiddenLabel;
      allNodes[selectedNode].hiddenLabel = undefined;
    }
  } else if (highlightActive === true) {
    for (var nodeId in allNodes) {
      if (allNodes[nodeId].hiddenColor !== undefined) {
        allNodes[nodeId].color = allNodes[nodeId].hiddenColor;
        allNodes[nodeId].hiddenColor = undefined;
      }
      if (allNodes[nodeId].hiddenLabel !== undefined) {
        allNodes[nodeId].label = allNodes[nodeId].hiddenLabel;
        allNodes[nodeId].hiddenLabel = undefined;
      }
    }
    highlightActive = false;
  }
  var updateArray = [];
  for (nodeId in allNodes) {
    if (allNodes.hasOwnProperty(nodeId)) {
      updateArray.push(allNodes[nodeId]);
    }
  }
  nodes.update(updateArray);
}

function getUrlParameter(name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    var results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
}

function controller() {
  return {
    text: getUrlParameter("q") || DEFAULT_TEXT,
    loading: false,
    error: false,
    intro: true,
    error_cb: null,
    start: function() { this.error = false; this.loading = true; },
    stop: function() { this.intro = false; this.loading = false; },
    run: async function(cb) { 
      if (this.text.trim() !== '') {
        cb && cb();
        window.history.replaceState(null, window.document.title, "/?q=" + encodeURIComponent(this.text) + (randomSeed ? "&s="+randomSeed : ""));
        this.start();
        this.error = await search(this.text);
        this.stop();
      }
    },
    clearError: function() { clearTimeout(this.error_cb); this.error_cb = setTimeout(() => {this.error = undefined; this.intro = true;}, 5000)}
  }
}

if (location.protocol !== 'https:') {
    location.replace(`https:${location.href.substring(location.protocol.length)}`);
}