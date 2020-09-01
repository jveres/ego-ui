const DEFAULT_TEXT = "apple";
const NETWORK_DOMAIN = "ego-network.jveres.repl.co";
const SVG_EL = document.getElementById('graph');

var graph = undefined;

function clearGraph() {  
  SVG_EL.innerHTML = "";
  graph = undefined;
}

function createGraph() {
  const width = SVG_EL.offsetWidth;
  const height = SVG_EL.offsetHeight;

  const colorScale = d3.scaleOrdinal(d3.schemeCategory10);
  const nodeSizeScale = d3.scaleSqrt()
    .domain([1, 50])
    .range([5, 15]);
  const labelSizeScale = d3.scaleSqrt()
    .domain([1, 50])
    .range([10, 18]);
  const linkWidthScale = d3.scaleSqrt()
    .domain([1, 11])
    .range([2, 20]);

  const forceLink = d3.forceLink(graph.links)
    .id(d => d.id)
    .distance(link => {
      const scale = d3.scaleSqrt()
        .domain([0, 11])
        .range([30, 70]);
      return scale(link.distance);
    })
    .strength(link => 1 / Math.min(link.source.count, link.target.count));

  const simulation = d3.forceSimulation(graph.nodes)
      .force("link", forceLink)
      .force("charge", d3.forceManyBody())
      .force("center", d3.forceCenter(width / 2, height / 2))
      .alphaDecay(0.03);

  const svg = d3.create("svg")
      .attr("viewBox", [0, 0, width, height])
      .call(d3.zoom()
        .scaleExtent([1 / 2, 4])
        .on("zoom", zoomed));

  const container = svg.append("g");
  
  svg.on("click", (e) => {
      if (e.target === svg.node()) {
        link.style("stroke-opacity", 0.6);
        node.style("opacity", 0.9);
        text.attr("display", "block");
      }
  });

  function zoomed({transform}) {
    container.attr("transform", transform);
  }
  
  const link = container.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(graph.links)
      .join("line")
      .attr("stroke-width", linkWidth);

  const node = container.append("g")
      .attr("opacity", 0.9)
      .attr("stroke", "#fff")
      .attr("stroke-width", 2)
      .selectAll("circle")
      .data(graph.nodes)
      .join("circle")
      .attr("r", nodeSize)
      .attr("fill", color)
      .call(drag(simulation));

  node.append("title")
      .text(d => d.id);
  
  const text = container.append("g")
      .attr("class", "labels")
      .selectAll("g")
      .data(graph.nodes)
      .enter().append("g");

  text.append("text")
      .attr("fill", "black")
      .attr("stroke", "#fff")
      .attr("stroke-width", 3)
      .attr("paint-order", "stroke fill")
      .attr("pointer-events", "none")
      .attr("text-anchor", "middle")
      .attr("dy", labeldY)
      .style("font-family", "sans-serif")
      .style("font-size", labelSize)
      .text(function(d) { return d.id; })  

  node.on("click", (_, d) => {   
      var _nodes = [d]
      link.style('stroke-opacity', function(l) {
          if (d === l.source) {
            _nodes.push(l.target);
            return 1.0;
          } else if (d === l.target) {
            _nodes.push(l.source);
            return 1.0;
          }
          else return 0.3;
      });
    
      node.style("opacity", function(n) {
        return _nodes.indexOf(n) !== -1 ? 0.8 : 0.3;
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

    node
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);
   
    text
        .attr("transform", d => `translate(${d.x}, ${d.y})`);
  });

  SVG_EL.appendChild(svg.node());
  return svg.node();

  function drag(simulation) {
  
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event,d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event,d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
  }

  function nodeSize(d) {
    return nodeSizeScale(d.count);
  }

  function labelSize(d) {
    return labelSizeScale(d.count);
  }

  function labeldY(d) {
    return 2 * nodeSize(d) + 2.0
  }

  function linkWidth(d) {
    return linkWidthScale(d.weight);
  }

  function color(d) {
    return colorScale(d.depth);
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