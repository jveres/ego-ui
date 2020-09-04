const DEFAULT_TEXT = "apple";
const NETWORK_DOMAIN = "ego-network.jveres.repl.co";
const SVG_EL = document.getElementById('graph');

const forceScale = d3.scaleSqrt().domain([0, 11]).range([30, 70]);
const nodeColor = d3.scaleOrdinal(d3.schemeCategory10);
const nodeSize = d3.scaleSqrt().domain([1, 50]).range([6, 18]);
const labelSize = d3.scaleSqrt().domain([1, 50]).range([10, 18]);
const linkWidth = d3.scaleSqrt().domain([1, 11]).range([1, 18]);

const NODE_OPACITY = 0.8;
const NODE_ACTIVE_OPACITY = 1.0;
const NODE_INACTIVE_OPACITY = 0.3;

const LINK_OPACITY = 0.6;
const LINK_ACTIVE_OPACITY = 1.0;
const LINK_INACTIVE_OPACITY = 0.3;

const MAX_STRENGTH = 15;

var graph = undefined;

function clearGraph() {  
  SVG_EL.innerHTML = "";
  graph = undefined;
}

function createGraph() {
  const width = SVG_EL.offsetWidth;
  const height = SVG_EL.offsetHeight;

  const forceLink = d3.forceLink(graph.links)
    .id(d => d.id)
    .distance(link => forceScale(link.distance))
    .strength(link => 1 / Math.max(MAX_STRENGTH, Math.min(link.source.count, link.target.count)));

  const simulation = d3.forceSimulation(graph.nodes)
      .force("link", forceLink)
      .force("charge", d3.forceManyBody())
      .force("center", d3.forceCenter(width / 2, height / 2))
      .alphaDecay(0.05)
      .velocityDecay(0.3);

  const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height])
      .call(d3.zoom()
        .scaleExtent([1 / 2, 4])
        .on("zoom", zoomed));

  const container = svg.append("g");
  
  svg.on("click", (e) => {
      if (e.target === svg.node()) {
        link.style("stroke-opacity", LINK_OPACITY);
        node.style("opacity", NODE_OPACITY);
        text.attr("display", "block");
      }
  });

  function zoomed({transform}) {
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

  node.filter(d => d.depth === 0)
      .append("circle")
      .attr("class", "pulse")
      .attr("stroke", d => nodeColor(d.depth))
      .attr("r", d => nodeSize(d.count));

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
      .style("font-size", d => labelSize(d.count))
      .text(d => d.id);  

  node.on("click", (_, d) => {   
      var _nodes = [d]
      link.style('stroke-opacity', function(l) {
          if (d === l.source) {
            _nodes.push(l.target);
            return LINK_ACTIVE_OPACITY;
          } else if (d === l.target) {
            _nodes.push(l.source);
            return LINK_ACTIVE_OPACITY;
          }
          else return LINK_INACTIVE_OPACITY;
      });
    
      node.style("opacity", function(n) {
        return _nodes.indexOf(n) !== -1 ? NODE_ACTIVE_OPACITY : NODE_INACTIVE_OPACITY;
      });
      
      text.attr("display", function(t) {
        return _nodes.indexOf(t) !== -1 ? "block": "none";
      });
  });

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

  function drag(simulation) {
  
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.02).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      simulation.restart();
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event, d) {
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
    graph = await fetch(window.location.protocol+'//' + NETWORK_DOMAIN + '/s/' + encodeURIComponent(query)).then(response => response.json());
    createGraph();
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
    start: function() { this.error = false; this.loading = true; },
    stop: function() { this.intro = false; this.loading = false; },
    run: async function(cb) { 
      if (this.text.trim() !== '') {
        cb && cb();
        window.history.replaceState(null, window.document.title, "/?q=" + encodeURIComponent(this.text));
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