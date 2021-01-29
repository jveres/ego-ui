const DEV = (location.protocol === 'file:' || window.location.hostname === "localhost");
const NETWORK_URL = DEV ? "http://localhost:8080/?d=4&r=11&q=" : "https://egonet.fly.dev:10001/?d=4&r=11&q=";

const DEFAULT_TEXT = "javascript";
const SVG_EL = document.getElementById('graph');

const distanceScale = d3.scaleLinear().domain([0, 11]).range([30, 60]);
const strengthScale = d3.scaleLinear().domain([1, 50]).range([-60, -30]);

const nodeColor = d3.scaleOrdinal(d3.schemeTableau10);
const nodeSize = d3.scaleSqrt().domain([1, 50]).range([6, 20]);
const labelSize = d3.scaleSqrt().domain([1, 50]).range([9, 18]);
const linkWidth = d3.scaleSqrt().domain([1, 11]).range([1, 18]);

const NODE_OPACITY = 0.8;
const NODE_ACTIVE_OPACITY = 1.0;
const NODE_INACTIVE_OPACITY = 0.3;

const LINK_OPACITY = 0.6;
const LINK_ACTIVE_OPACITY = 1.0;
const LINK_INACTIVE_OPACITY = 0.3;

const COLLIDE_RADIUS = 20;
const CHARGE_DISTANCE_MIN = 20;
const CHARGE_DISTANCE_MAX = 250;
const ALPHA_DECAY = 0.05;
const VELOCITY_DECAY = 0.3;

const LONGPRESS_DURATION = 3000;

var graph, ngraph;

function clearGraph() {
  SVG_EL.innerHTML = "";
  graph = undefined;
  ngraph = undefined;
}

function buildGraph() {
  const width = SVG_EL.offsetWidth;
  const height = SVG_EL.offsetHeight;

  const forceLink = d3.forceLink(graph.links)
    .id(d => d.id)
    .distance(link => distanceScale(link.distance));

  const simulation = d3.forceSimulation(graph.nodes)
    .force("link", forceLink)
    .force("charge", d3.forceManyBody()
      .strength(d => -50 + strengthScale(d.count))
      .distanceMin(CHARGE_DISTANCE_MIN)
      .distanceMax(CHARGE_DISTANCE_MAX)
    )
    .force("collide", d3.forceCollide()
      .radius(COLLIDE_RADIUS)
    )
    .force("center", d3.forceCenter(width / 2, height / 2))
    .alphaDecay(ALPHA_DECAY)
    .velocityDecay(VELOCITY_DECAY);

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .call(d3.zoom()
      .scaleExtent([1 / 3, 5])
      .on("zoom", zoomed));

  const container = svg.append("g");

  svg.on("click", e => {
    if (e.target === svg.node()) {
      link.style("stroke-opacity", LINK_OPACITY);
      node.style("opacity", NODE_OPACITY);
      text.attr("display", "block");
    }
  });

  function zoomed({
    transform
  }) {
    container.attr("transform", transform);
  }

  const link = container.append("g")
    .selectAll("line")
    .data(graph.links)
    .join("line")
    .attr("stroke-width", d => linkWidth(d.weight))
    .attr("stroke", "#999")
    .attr("stroke-opacity", LINK_OPACITY);

  link.append("title").text(d => d.query);

  const node = container.append("g")
    .attr("stroke", "#fff")
    .attr("stroke-width", 2)
    .selectAll("g")
    .data(graph.nodes)
    .join("g")
    .style("opacity", NODE_OPACITY)
    .call(drag(simulation));

  node.append("circle")
    .attr("r", d => nodeSize(d.count))
    .attr("fill", d => nodeColor(d.depth));

  const text = container.append("g")
    .attr("class", "labels")
    .selectAll("g")
    .data(graph.nodes)
    .enter().append("g");

  text.append("text")
    .attr("fill", "black")
    .attr("stroke", "#fff")
    .attr("stroke-width", 2)
    .attr("paint-order", "stroke fill")
    .attr("pointer-events", "none")
    .attr("text-anchor", "middle")
    .attr("dy", d => 2 * nodeSize(d.count) + 2.0)
    .style("font-family", "sans-serif")
    .style("font-size", d => labelSize(d.count) + "px") // Firefox needs "px"
    .text(d => d.id);

  var skipNextClick = false;

  node.on("click", (event, d) => {
    if (skipNextClick === true) {
      skipNextClick = false;
      return;
    }
    var _nodes = [d];
    if (event.shiftKey) {
      // shortest path
      var root;
      node.filter(d => {
        if (d.depth === 0) {
          root = d;
          return true;
        }
      });
      const path = ngraphPath.nba(ngraph, {
        distance(fromNode, toNode, link) {
          return link.data.distance;
        }
      });
      _nnodes = path.find(root.id, d.id);
      link.style('stroke-opacity', LINK_INACTIVE_OPACITY);
      for (var i = 1; i < _nnodes.length; i++) {
        link.filter(l => (l.source.id === _nnodes[i].id && l.target.id === _nnodes[i - 1].id) || (l.target.id === _nnodes[i].id && l.source.id === _nnodes[i - 1].id)).style('stroke-opacity', LINK_ACTIVE_OPACITY);
        _nodes.push(node.filter(n => n.id === _nnodes[i].id).data()[0]);
      }
    } else {
      // connected nodes
      link.style('stroke-opacity', l => {
        if (d === l.source) {
          _nodes.push(l.target);
          return LINK_ACTIVE_OPACITY;
        } else if (d === l.target) {
          _nodes.push(l.source);
          return LINK_ACTIVE_OPACITY;
        } else return LINK_INACTIVE_OPACITY;
      });
    }
    node.style("opacity", n => _nodes.indexOf(n) !== -1 ? NODE_ACTIVE_OPACITY : NODE_INACTIVE_OPACITY);
    text.attr("display", t => _nodes.indexOf(t) !== -1 ? "block" : "none");
  });

  node.filter(d => d.depth === 0)
    .append("circle")
    .attr("class", "pulse")
    .attr("stroke", d => nodeColor(d.depth))
    .attr("r", d => nodeSize(d.count));

  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node.attr("transform", d => `translate(${d.x}, ${d.y})`);

    text.attr("transform", d => `translate(${d.x}, ${d.y})`);
  });

  SVG_EL.appendChild(svg.node());
  ngraph = createGraph();
  graph.links.map(l => ngraph.addLink(l.source.id, l.target.id, {
    distance: l.distance
  }));

  var _time, _timer;

  function drag(simulation) {

    function dragstarted(event, d) {
      _time = new Date();
      _timer = setTimeout(_ => {
        var clickEvent = new Event("click", {
          bubbles: true
        });
        clickEvent.shiftKey = true;
        event.sourceEvent.target.dispatchEvent(clickEvent);
        //skipNextClick = true;
      }, LONGPRESS_DURATION);
      if (!event.active) simulation.alphaTarget(0.005).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      clearTimeout(_timer);
      _timer = null;
      _time = null;
      simulation.restart();
      d3.select(this).raise();
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      clearTimeout(_timer);
      _timer = null;
      _time = null;
      if (!event.active) simulation.alphaTarget(0);
    }

    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }
}

async function search(query) {
  query = query.trim().toLocaleLowerCase();
  try {
    clearGraph();
    graph = await fetch(NETWORK_URL + encodeURIComponent(query))
      .then(response => response.json())
      .then(json => JSON.parse(json.graph));
    buildGraph();
    document.title = "EgoNet · " + query;
  } catch (e) {
    console.log(e);
    return e;
  }
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
    start: function () {
      this.error = false;
      this.loading = true;
    },
    stop: function () {
      this.intro = false;
      this.loading = false;
    },
    run: async function (cb) {
      if (this.text.trim() !== '') {
        cb && cb();
        if (!DEV) window.history.replaceState(null, window.document.title, "/?q=" + encodeURIComponent(this.text));
        this.start();
        this.error = await search(this.text);
        this.stop();
      }
    },
    clearError: function () {
      clearTimeout(this.error_cb);
      this.error_cb = setTimeout(() => {
        this.error = undefined;
        this.intro = true;
      }, 5000);
    }
  }
}

if (!DEV && location.protocol !== 'https:') {
  location.replace(`https:${location.href.substring(location.protocol.length)}`);
}