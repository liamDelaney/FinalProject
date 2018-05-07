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
	let transform = d3.event.transform;
	tx = Math.min(0, Math.max(transform.x, width *1 - width * transform.k+0*width*(transform.k-1)/7)),
	//ty = Math.min(0, Math.max(transform.x, height - height * transform.k));
	transform.x = tx;
	zoom.transform.x = tx;
	//transform.y = ty;
	/*	// then, update the zoom behavior's internal translation, so that
		// it knows how to properly manipulate it on the next movement
		zoom.translate([tx, ty]);
		// and finally, update the <g> element's transform attribute with the
		// correct translation and scale (in reverse order)
		g.attr("transform", [
		  "translate(" + [tx, ty] + ")",
		  "scale(" + e.scale + ")"
	].join(" "));*/
	gX.call(xAxis.scale(d3.event.transform.rescaleX(xScale)));
	 currentX = d3.event.transform.rescaleX(xScale);
	//const newY = d3.event.transform.rescaleY(yScale);
	gY.call(yAxis.scale(yScale));
	RescaleY(dataFiltered,currentX);
	createLine.x(d => currentX(new Date(d.date)));
	createLine.y(d => yScale(d.price));
	canvas.selectAll('path.line')
	  .datum(dataFiltered)
	  .attr('d', createLine)
	  .attr('clip-path', 'url(#clip)');
	  RedrawY();
    canvas.selectAll('.dot')
        .data(eventData)
        .attr("cx",function(d){return currentX(new Date(d.Date))});
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
const GetDataAtDate= (date)=>{
	var d = {};
	for(var i = 0 ; i < globalData.length; i++){
		if(date < globalData[i].date){
			break;
		}
		d = globalData[i];
	}
	return d;
};
const initiateCanvas = () => {
  svg = d3.select('#chart-container>svg');
  svg.selectAll('*').remove();

  const dataFiltered = filterData();

  width = $('#chart-container>svg').width() - margin.left - margin.right;
  height = $('#chart-container>svg').height() - margin.top - margin.bottom;


   canvasHeight = height - margin.top - margin.bottom;
   canvasWidth = width - margin.left - margin.right;
    
    tooltipY = 

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
	currentX = xScale;
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
    .attr('height', canvasHeight + 200);

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
    
    eventTooltip.style("top", (canvasHeight + 170) + "px");
    
    canvas.append("g")
        .selectAll("dot")
        .data(eventData)
        .enter().append("a")
        .attr("xlink:href", function(d){
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
        .attr("cy",canvasHeight + 45)
        .attr("cursor", "pointer")
        .attr('clip-path', 'url(#clip)');
    
    canvas.append("line")
        .attr("x1", 0)
        .attr("y1", canvasHeight + 40)
        .attr("x2", canvasWidth)
        .attr("y2", canvasHeight + 40)
        .style("opacity", 1)
        .style("stroke", "grey");
    
    canvas.append("line")
        .attr("x1", 0)
        .attr("y1", canvasHeight + 50)
        .attr("x2", canvasWidth)
        .attr("y2", canvasHeight + 50)
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
  //console.log(xScale(limits.maxX));
   /* svg.append('rect')
      .attr('class', 'overlay')
      .attr('width', width)
      .attr('height', height)
      .on('mouseover', () => focus.style('display', null))
      .on('mouseout', () => focus.style('display', 'none'))
   .on('mousemove', mousemove);*/
  zoom = d3.zoom().scaleExtent([1, 9]);
	
  zoom.on('zoom', () => zoomed(gX, gY, dataFiltered, eventData));
  
  svg.on("mousemove", mousemove);
  svg.call(zoom);
  RedrawY();
};
let mouselabel = null;
let mouseline = null;

var eventTooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0);

const mousemove= (e)=>{
	let mousex = d3.mouse(svg.node())[0];
	let x0 = currentX.invert(mousex- margin.left);
	//console.log([x0,currentX.invert(0)]);
	if(mouseline == null){
		mouselabel = svg.append('text');
		mouseline = svg.append('rect')
			.attr('width','1')
			.attr('height',height * 0.95)
			
		/*svg.on("mouseout", ()=>{
			mouseline.style('fill','rgba(0,0,0,0.0)');
		});*/
		
	}
	let d = GetDataAtDate(x0);
	let str = "$"+d.price.toFixed(2);
	mouselabel.text(str);
	var xpos = currentX(d.date)+margin.left;
    
    var pastDate = new Date(d.date);
    var futureDate = new Date(d.date);
    pastDate.setDate(pastDate.getDate() - 14);
    futureDate.setDate(futureDate.getDate() + 14);
    console.log(pastDate >= futureDate);
    console.log(d.date, "present")
    console.log(futureDate, "future");
    
    for(event in eventData){
        if(pastDate <= new Date(eventData[event]["Date"]) && futureDate >= new Date(eventData[event]["Date"])){
            eventTooltip.style("opacity", .85);
            eventTooltip.html(eventData[event]["Date"] + "<br/><b style='font-size: 16px;'>" + eventData[event]["Title"] + " </b><br/>" +
                        eventData[event]["Description"] + "<br/>")
            .style("left", (d3.event.pageX - 200) + "px")
            .style("top", (canvasHeight + 170) + "px");
            break;
        }
        else{
            eventTooltip.style("opacity", 0);
        }
    }
    
	
	if(xpos < margin.left || xpos>width-margin.right){
		mouseline.style('fill','rgba(0,0,0,0.0)');
	}else{
		mouseline.style('fill','rgba(0,0,0,0.2)');
	}
	mouseline.attr('transform','translate('+ xpos+','+margin.top+')');
	mouselabel.attr('transform','translate('+ xpos+','+(margin.top+40)+')');
    
    
};
$(document).ready(() => {
  d3.csv('data/market-price.csv', (error, data) => {
    globalData = data.map((d) => {
      const newd = _.clone(d);
      newd.date = new Date(newd.date);
      newd.price = parseFloat(newd.price);
      return newd;
    });
 d3.csv('data/events-timeline.csv', (error, data) => {
    eventData = data.map((d) => {
      const newe = _.clone(d);
      newe.date = new Date(newe.date);
      return newe;
    
    });
    console.log(eventData);
    
    initiateCanvas();

    bindArrowKeys();
    });
  });
});