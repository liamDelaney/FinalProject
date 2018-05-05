let globalData;
let eventData;
const margin = {
  top: 50,
  right: 50,
  bottom: 10,
  left: 50,
};

let width;
let height;
let canvasHeight;
let canvasWidth;
let xScale = null;
let yScale = null;
let xAxis;
let yAxis;
let svg;
let zoom;
let canvas = null;
const limits = {
  maxY: null,
  minY: null,
  maxX: null,
  minX: null,
};

const settings = {
  targets: [],
  detail: {
    type: 'line',
  },
};

let createLine;

let keydownFired = 0;

const bindArrowKeys = () => {
  $(document).keydown((e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') {
      return;
    }

    const dis = e.key === 'ArrowLeft' ? 100 : -100;
    if (keydownFired === 0) {
      svg.transition()
        .duration(200)
        .ease(d3.easeCubicInOut)
        .call(zoom.translateBy, dis, 0);
    } else if (new Date().getTime() - 400 > keydownFired) {
      // wait for 2x the transition time to start continuous scrolling
      zoom.translateBy(svg, dis / 20, 0);
    }

    if (keydownFired === 0) {
      keydownFired = new Date().getTime();
    }
  });

  $(document).keyup(() => {
    keydownFired = 0;
  });
};

const filterData = () => globalData.filter(() => true);

const zoomed = (gX,gY, dataFiltered, eventData) => {
  gX.call(xAxis.scale(d3.event.transform.rescaleX(xScale)));
  const newX = d3.event.transform.rescaleX(xScale);
  //const newY = d3.event.transform.rescaleY(yScale);
  gY.call(yAxis.scale(yScale));
  RescaleY(dataFiltered,newX);
  createLine.x(d => newX(new Date(d.date)));
  createLine.y(d => yScale(d.price));
  canvas.selectAll('path.line')
    .datum(dataFiltered)
    .attr('d', createLine)
    .attr('clip-path', 'url(#clip)');
	RedrawY();
  d3.select("#canvas").selectAll(".dot")
    .data(eventData)
    .attr("cx",function(d){return newX(new Date(d.Date))});
};
const RescaleY = (dataFiltered,currentX)=>{
	//console.log(new Date(currentX.invert(0)));
	//console.log(new Date(currentX.invert(canvasWidth)));
	let minX = currentX.invert(0);
	let maxX = currentX.invert(canvasWidth);
	
	
  const eMaxY = d3.max(dataFiltered, (d) => {
  
	if(d.date >= limits.minX && d.date <= limits.maxX && 
		d.date >= minX && d.date <= maxX ){
		return d.price;
	}
	return 1;
  });
  const eMinY = d3.min(dataFiltered, (d) => {
	return 0;
  });
  limits.maxY = eMaxY;
  limits.minY = eMinY;


  yScale = d3.scaleLinear()
    .domain([limits.maxY * 1.1, limits.minY - (limits.minY * 0.1)])
    .range([0, +canvas.attr('height')]);
};
const RedrawY = ()=>{
  d3.selectAll('.axis--y > g.tick > line')
    .attr('x2', canvasWidth)
    .style('stroke', 'lightgrey');
};

const initiateCanvas = () => {
  svg = d3.select('#chart-container>svg');
  svg.selectAll('*').remove();

  const dataFiltered = filterData();

  width = $('#chart-container>svg').width() - margin.left - margin.right;
  height = $('#chart-container>svg').height() - margin.top - margin.bottom;


   canvasHeight = height - margin.top - margin.bottom;
   canvasWidth = width - margin.left - margin.right;

   canvas = svg.append('g')
    .attr('id', 'canvas')
    .attr('width', canvasWidth)
    .attr('height', canvasHeight)
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  const eMaxX = d3.max(dataFiltered, d => d.date);
  const eMinX = d3.min(dataFiltered, d => d.date);

  if (limits.maxX == null) {
    limits.maxX = eMaxX;
  } else if (eMaxX > limits.maxX) {
    limits.maxX = eMaxX;
  }

  if (limits.minX == null) {
    limits.minX = eMinX;
  } else if (eMinX < limits.minX) {
    limits.minX = eMinX;
  }

  xScale = d3.scaleTime()
    .domain([limits.minX, limits.maxX])
    .range([0, +canvas.attr('width')]);
	
  RescaleY(dataFiltered,xScale);
  createLine = d3.line().x(d => xScale(d.date)).y(d => yScale(d.price));

  xAxis = d3.axisBottom(xScale);
  yAxis = d3.axisLeft(yScale);

  canvas.selectAll('.targets')
    .data(settings.targets)
    .enter()
    .append('line')
    .classed('targets', true)
    .style('stroke', d => d.color)
    .style('stroke-width', 1)
    .attr('x1', xScale(limits.minX))
    .attr('x2', yScale(limits.maxX))
    .attr('y1', d => d.value)
    .attr('y2', d => d.value);

  canvas.append('clipPath')
    .attr('id', 'clip')
    .append('rect')
    .attr('width', canvasWidth)
    .attr('height', canvasHeight * 1.1);

  const gX = canvas.append('g')
    .attr('transform', 'translate(0,' + (+canvas.attr('height')) + ')')
    .attr('class', 'axis axis--x')
    .call(xAxis);

  const gY = canvas.append('g').attr('class', 'axis axis--y').call(yAxis);


  canvas
    .append('path')
    .datum(dataFiltered)
    .attr('fill', 'none')
    .classed('line', true)
    .attr('stroke', 'steelblue')
    .attr('stroke-linejoin', 'round')
    .attr('stroke-linecap', 'round')
    .attr('stroke-width', 1.5)
    .attr('d', createLine)
    .attr('clip-path', 'url(#clip)');
    
    var eventTooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

    canvas.append("g")
        .selectAll("dot")
        .data(eventData)
        .enter().append("a")
        .attr("xlink:href", function(d){
            console.log(d.Link)
            return d.Link})
        .append("circle")
        .attr('class', 'dot')
        .attr("r", 5)
        .style("opacity", 1)
        .style("fill", "white")
        .attr("stroke", "steelblue")
        .attr("stroke-width", "1px")
        .attr("cx",function(d){
            return xScale(new Date(d.Date))})
        .attr("cy",canvasHeight * 1.05)
        .attr("cursor", "pointer")
        .attr('clip-path', 'url(#clip)')
        .on("mouseover", function (d) {
                    eventTooltip.transition()
                        .duration(200)
                        .style("opacity", .85);
                    eventTooltip.html("Date: " + d.Date + "<br/>" +
                        "Info: " + d.Description + "<br/>"
                    )
                    .style("left", (d3.event.pageX + 10) + "px")
                    .style("top", (d3.event.pageY - 115) + "px");
                })
                .on("mouseout", function (d) {
                    eventTooltip.transition()
                        .duration(400)
                        .style("opacity", 0);
                });;
    
    canvas.append("line")
        .attr("x1", 0)
        .attr("y1", canvasHeight * 1.05 - 5)
        .attr("x2", canvasWidth)
        .attr("y2", canvasHeight * 1.05 - 5)
        .style("opacity", 1)
        .style("stroke", "grey");
    
    canvas.append("line")
        .attr("x1", 0)
        .attr("y1", canvasHeight * 1.05 + 5)
        .attr("x2", canvasWidth)
        .attr("y2", canvasHeight * 1.05 + 5)
        .style("opacity", 1)
        .style("stroke", "grey");
    
    
  canvas.append('g')
    .attr(
      'transform',
      `translate(-40,${canvas.attr('height') / 2}) rotate(270)`,
    ).append('text')
    .attr('text-anchor', 'middle')
    .text('price');

  zoom = d3.zoom().on('zoom', () => zoomed(gX, gY, dataFiltered, eventData));
  svg.call(zoom);
  RedrawY();
};

$(document).ready(() => {
  d3.csv('data/market-price.csv', (error, data) => {
    globalData = data.map((d) => {
      const newd = _.clone(d);
      newd.date = new Date(newd.date);
      newd.price = parseFloat(newd.price);
      return newd;
    });
 d3.csv('data/event-timeline.csv', (error, data) => {
    eventData = data.map((d) => {
      const newe = _.clone(d);
      newe.date = new Date(newe.date);
      return newe;
    
    });
    
    
    initiateCanvas();

    bindArrowKeys();
    });
  });
});
