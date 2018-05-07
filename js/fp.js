let tickerData;
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
let currentXScale = xScale;
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

let mouselabel = null;
let mouseline = null;

const eventTooltip = d3.select('#event-tooltip')
  .attr('class', 'tooltip');

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

const filterData = () => tickerData.filter(() => true);

const drawGridLines = () => {
  d3.selectAll('.axis--y > g.tick > line')
    .attr('x2', canvasWidth);
};

const rescaleY = (dataFiltered) => {
  const minX = currentXScale.invert(0);
  const maxX = currentXScale.invert(canvasWidth);

  const eMaxY = d3.max(dataFiltered, (d) => {
    if (d.date >= limits.minX && d.date <= limits.maxX &&
      d.date >= minX && d.date <= maxX) {
      return d.price;
    }
    return 1;
  });
  limits.maxY = eMaxY;
  limits.minY = 0;

  yScale = d3.scaleLinear()
    .domain([limits.maxY * 1.1, limits.minY - (limits.minY * 0.1)])
    .range([0, +canvas.attr('height')]);
};

const zoomed = (gX, gY, dataFiltered) => {
  const { transform } = d3.event;
  transform.x = Math.min(0, Math.max(transform.x, width * (1 - transform.k)));
  zoom.transform.x = transform.x;
  gX.call(xAxis.scale(d3.event.transform.rescaleX(xScale)));
  currentXScale = d3.event.transform.rescaleX(xScale);
  gY.call(yAxis.scale(yScale));
  rescaleY(dataFiltered);
  createLine.x(d => currentXScale(new Date(d.date)));
  createLine.y(d => yScale(d.price));
  canvas.selectAll('path.line')
    .datum(dataFiltered)
    .attr('d', createLine)
    .attr('clip-path', 'url(#clip)');
  drawGridLines();
  canvas.selectAll('.dot')
    .data(eventData)
    .attr('cx', d => currentXScale(new Date(d.date)));
};

const getDataAtDate = (date) => {
  let d = null;
  for (let i = 0; i < tickerData.length; i += 1) {
    if (date < tickerData[i].date) {
      break;
    }
    d = tickerData[i];
  }
  return d;
};

const mousemove = () => {
  const mousex = d3.mouse(svg.node())[0] - margin.left;
  const mouseDate = currentXScale.invert(mousex);
  if (mouseline === null) {
    mouselabel = svg.append('text');
    mouseline = svg.append('rect')
      .classed('vertical-line', true)
      .attr('width', '1')
      .attr('height', height * 0.95);
  }

  const d = getDataAtDate(mouseDate);

  if (d === null) {
    return;
  }
  const str = `$${d.price.toFixed(2)}`;
  mouselabel.text(str);
  const xpos = currentXScale(d.date) + margin.left;

  let mouseEvent = null;
  for (let i = 0; i < eventData.length; i += 1) {
    if (eventData[i].date >= currentXScale.invert(mousex - 5) &&
      eventData[i].date <= currentXScale.invert(mousex + 5)) {
      mouseEvent = eventData[i];
      break;
    }
  }

  if (mouseEvent !== null) {
    $('svg .vertical-line')
      .addClass('active-event')
      .removeClass('active');
    $(`#${mouseEvent.id}`).addClass('active');
    eventTooltip
      .html(`
        <p>${moment(mouseEvent.date).format('MMM DD, YYYY')}</p>
        <div class="h6">${mouseEvent.Title}</div>
        <p>${mouseEvent.Description}</p>`)
      .style('left', `${d3.event.pageX - 200}px`);
  } else {
    $('.dot').removeClass('active');
    $('svg .vertical-line')
      .addClass('active')
      .removeClass('active-event');
    eventTooltip
      .html(`<p>${moment(mouseDate).format('MMM DD, YYYY')}</p>`)
      .style('left', `${d3.event.pageX - 200}px`);
  }

  mouseline.classed('active', xpos >= margin.left && xpos <= width - margin.right);
  mouseline.attr('transform', `translate(${xpos}, ${margin.top})`);
  mouselabel.attr('transform', `translate(${xpos + 5}, ${margin.top + 40})`);
};

const initiateCanvas = () => {
  svg = d3.select('#chart-container>svg');
  svg.selectAll('*').remove();

  const dataFiltered = filterData();

  width = $('#chart-container>svg').width() - margin.left - margin.right;
  height = $('#chart-container>svg').height() - margin.top - margin.bottom;


  canvasHeight = height - margin.top - margin.bottom;
  canvasWidth = width - margin.left - margin.right;

  // tooltipY =

  canvas = svg
    .append('g')
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
  currentXScale = xScale;
  rescaleY(dataFiltered, xScale);
  createLine = d3.line().x(d => xScale(d.date)).y(d => yScale(d.price));

  xAxis = d3.axisBottom(xScale);
  yAxis = d3.axisLeft(yScale);

  canvas.append('clipPath')
    .attr('id', 'clip')
    .append('rect')
    .attr('width', canvasWidth)
    .attr('height', canvasHeight + 200);

  const gX = canvas.append('g')
    .attr('transform', `translate(0, ${canvas.attr('height')})`)
    .attr('class', 'axis axis--x')
    .call(xAxis);

  const gY = canvas.append('g').attr('class', 'axis axis--y').call(yAxis);


  canvas
    .append('path')
    .datum(dataFiltered)
    .classed('line', true)
    .attr('d', createLine)
    .attr('clip-path', 'url(#clip)');

  canvas.append('g')
    .selectAll('dot')
    .data(eventData)
    .enter()
    .append('a')
    .attr('xlink:href', d => d.Link)
    .append('circle')
    .attr('id', d => d.id)
    .attr('class', 'dot')
    .attr('r', 5)
    .attr('cx', d => xScale(new Date(d.date)))
    .attr('cy', canvasHeight + 45)
    .attr('clip-path', 'url(#clip)');

  canvas.append('line')
    .attr('x1', 0)
    .attr('y1', canvasHeight + 40)
    .attr('x2', canvasWidth)
    .attr('y2', canvasHeight + 40)
    .classed('timeline', true);

  canvas.append('line')
    .attr('x1', 0)
    .attr('y1', canvasHeight + 50)
    .attr('x2', canvasWidth)
    .attr('y2', canvasHeight + 50)
    .classed('timeline', true);

  canvas.append('g')
    .attr(
      'transform',
      `translate(-40,${canvas.attr('height') / 2}) rotate(270)`,
    ).append('text')
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')
    .text('price (USD)');
  zoom = d3.zoom().on('zoom', () => zoomed(gX, gY, dataFiltered, eventData));
  zoom = d3.zoom().scaleExtent([1, 9]);

  zoom.on('zoom', () => zoomed(gX, gY, dataFiltered, eventData));

  svg.on('mousemove', mousemove);
  svg.call(zoom);
  drawGridLines();
};

$(document).ready(() => {
  let loaded = 0;
  d3.csv('data/market-price.csv', (error, data) => {
    tickerData = data.map((d) => {
      const newd = _.clone(d);
      newd.date = new Date(newd.date);
      newd.price = parseFloat(newd.price);
      return newd;
    });
    tickerData = _.sortBy(tickerData, ['date']);
    loaded += 1;

    if (loaded === 2) {
      initiateCanvas();
      bindArrowKeys();
    }
  });

  d3.csv('data/events-timeline.csv', (error, data) => {
    eventData = data.map((d, i) => {
      const newe = _.clone(d);
      newe.date = new Date(newe.Date);
      newe.Date = undefined;
      newe.id = `event-${i}`;
      return newe;
    });
    eventData = _.sortBy(eventData, ['Date']);
    loaded += 1;

    if (loaded === 2) {
      initiateCanvas();
      bindArrowKeys();
    }
  });
});
