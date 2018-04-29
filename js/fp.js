let globalData;
const margin = {
  top: 50,
  right: 50,
  bottom: 10,
  left: 50,
};

let width;
let height;
let xScale = null;
let yScale = null;
let xAxis;
let yAxis;
let svg;
let zoom;

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

const zoomed = (gX, canvas, dataFiltered) => {
  gX.call(xAxis.scale(d3.event.transform.rescaleX(xScale)));
  const newX = d3.event.transform.rescaleX(xScale);

  createLine.x(d => newX(new Date(d.date)));
  canvas.selectAll('path.line')
    .datum(dataFiltered)
    .attr('d', createLine)
    .attr('clip-path', 'url(#clip)');
};

const initiateCanvas = () => {
  svg = d3.select('#chart-container>svg');
  svg.selectAll('*').remove();

  const dataFiltered = filterData();

  width = $('#chart-container>svg').width() - margin.left - margin.right;
  height = $('#chart-container>svg').height() - margin.top - margin.bottom;


  const limits = {
    maxY: null,
    minY: null,
    maxX: null,
    minX: null,
  };

  const canvasHeight = height - margin.top - margin.bottom;
  const canvasWidth = width - margin.left - margin.right;

  const canvas = svg.append('g')
    .attr('id', 'canvas')
    .attr('width', canvasWidth)
    .attr('height', canvasHeight)
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

  const eMaxY = d3.max(dataFiltered, d => d.price);
  const eMinY = d3.min(dataFiltered, d => d.price);
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

  if (limits.maxY == null) {
    limits.maxY = eMaxY;
  } else if (eMaxY > limits.maxY) {
    limits.maxY = eMaxY;
  }

  if (limits.minY == null) {
    limits.minY = eMinY;
  } else if (eMinY < limits.minY) {
    limits.minY = eMinY;
  }

  settings.targets.forEach((d) => {
    console.log(d);
    if (limits.maxY < d.value) {
      limits.maxY = d.value;
    }
    if (limits.minY > d.value) {
      limits.minY = d.value;
    }
  });

  xScale = d3.scaleTime()
    .domain([limits.minX, limits.maxX])
    .range([0, +canvas.attr('width')]);
  yScale = d3.scaleLinear()
    .domain([limits.maxY * 1.1, limits.minY - (limits.minY * 0.1)])
    .range([0, +canvas.attr('height')]);
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
    .attr('height', canvasHeight);

  const gX = canvas.append('g')
    .attr('transform', 'translate(0,' + (+canvas.attr('height')) + ')')
    .attr('class', 'axis axis--x')
    .call(xAxis);

  canvas.append('g').attr('class', 'axis axis--y').call(yAxis);

  d3.selectAll('.axis--y > g.tick > line')
    .attr('x2', canvasWidth)
    .style('stroke', 'lightgrey');

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

  canvas.append('g')
    .attr(
      'transform',
      `translate(-40,${canvas.attr('height') / 2}) rotate(270)`,
    ).append('text')
    .attr('text-anchor', 'middle')
    .text('price');

  zoom = d3.zoom().on('zoom', () => zoomed(gX, canvas, dataFiltered));

  svg.call(zoom);
};

$(document).ready(() => {
  d3.csv('data/market-price.csv', (error, data) => {
    globalData = data.map((d) => {
      const newd = _.clone(d);
      newd.date = new Date(newd.date);
      newd.price = parseFloat(newd.price);
      return newd;
    });

    initiateCanvas();

    bindArrowKeys();
  });
});
